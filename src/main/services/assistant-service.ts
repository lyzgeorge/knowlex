/**
 * Assistant Service
 *
 * Atomic module for generating assistant messages with streaming support.
 * Handles the complete lifecycle of AI response generation including:
 * - Streaming text and reasoning content
 * - Real-time event emission to renderer
 * - Error handling and cancellation
 * - Message persistence and updates
 *
 * This module abstracts the common logic used by both message sending
 * and message regeneration to eliminate code duplication.
 */

import type { Message, MessageContent } from '../../shared/types/message'
import { streamAIResponse } from './openai-adapter'
import { updateMessage, getMessages } from './message'
import { cancellationManager } from '../utils/cancellation'
import { sendMessageEvent, MESSAGE_EVENTS } from '../ipc/conversation'

/**
 * Configuration for assistant message generation
 */
export interface AssistantGenConfig {
  /** ID of the message to update with the generated content */
  messageId: string
  /** ID of the conversation for context */
  conversationId: string
  /** Messages to use as context for AI generation */
  contextMessages: Message[]
  /** Optional callback for when generation completes successfully */
  onSuccess?: (updatedMessage: Message) => Promise<void>
  /** Optional callback for when generation fails */
  onError?: (error: Error, errorMessage: Message) => Promise<void>
}

/**
 * Generates an assistant message with streaming support
 *
 * This function handles the complete lifecycle:
 * 1. Sets up cancellation token
 * 2. Sends streaming start event
 * 3. Generates AI response with real-time streaming
 * 4. Updates message with final content
 * 5. Sends completion event
 * 6. Handles errors gracefully
 * 7. Cleans up resources
 *
 * @param config Generation configuration
 * @returns Promise that resolves when generation starts (not when it completes)
 */
export async function streamAssistantReply(config: AssistantGenConfig): Promise<void> {
  const { messageId, contextMessages, onSuccess, onError } = config

  // Create cancellation token for this streaming operation
  const cancellationToken = cancellationManager.createToken(messageId)

  // Send streaming start event
  sendMessageEvent(MESSAGE_EVENTS.STREAMING_START, {
    messageId,
    message: await updateMessage(messageId, {
      content: [{ type: 'text' as const, text: '\u200B' }] // Zero-width space placeholder
    })
  })

  // Start background streaming process (don't await)
  setImmediate(async () => {
    // Track accumulated content for immediate DB writes
    let accumulatedText = ''
    let accumulatedReasoning = ''
    let streamingActive = true

    try {
      // Generate AI response with streaming
      const response = await streamAIResponse(
        contextMessages,
        {
          onTextStart: () => {
            console.log('[ASSISTANT_GEN] Sending text start event for message:', messageId)
            // Send text start event
            sendMessageEvent(MESSAGE_EVENTS.TEXT_START, {
              messageId
            })
          },
          onTextChunk: (chunk: string) => {
            // Accumulate text content
            accumulatedText += chunk

            // Send each text chunk via event
            sendMessageEvent(MESSAGE_EVENTS.STREAMING_CHUNK, {
              messageId,
              chunk
            })
          },
          onTextEnd: () => {
            console.log('[ASSISTANT_GEN] Sending text end event for message:', messageId)
            // Send text end event
            sendMessageEvent(MESSAGE_EVENTS.TEXT_END, {
              messageId
            })
          },
          onReasoningStart: () => {
            console.log('[ASSISTANT_GEN] Sending reasoning start event for message:', messageId)
            // Send reasoning start event
            sendMessageEvent(MESSAGE_EVENTS.REASONING_START, {
              messageId
            })
          },
          onReasoningChunk: (chunk: string) => {
            // Accumulate reasoning content
            accumulatedReasoning += chunk

            // Send each reasoning chunk via event
            sendMessageEvent(MESSAGE_EVENTS.REASONING_CHUNK, {
              messageId,
              chunk
            })
          },
          onReasoningEnd: () => {
            console.log('[ASSISTANT_GEN] Sending reasoning end event for message:', messageId)
            // Send reasoning end event
            sendMessageEvent(MESSAGE_EVENTS.REASONING_END, {
              messageId
            })
          }
        },
        cancellationToken
      )

      streamingActive = false

      // Check if the operation was cancelled
      const wasCancelled = cancellationToken.isCancelled

      let finalMessage: Message

      if (wasCancelled) {
        console.log('Streaming cancelled, writing accumulated content to DB:', {
          textLength: accumulatedText.length,
          reasoningLength: accumulatedReasoning.length
        })

        // Write accumulated partial content immediately on cancellation
        const partialUpdateData: any = {
          content: [{ type: 'text' as const, text: accumulatedText || '\u200B' }]
        }

        if (accumulatedReasoning) {
          partialUpdateData.reasoning = accumulatedReasoning
        }

        const updatedMessage = await updateMessage(messageId, partialUpdateData)

        // Send streaming cancelled event with partial message
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, {
          messageId,
          message: updatedMessage
        })

        finalMessage = updatedMessage
      } else {
        console.log('Streaming completed, writing final content to DB')

        // Write complete final content on successful completion
        const finalUpdateData: any = {
          content: response.content
        }

        if (response.reasoning !== undefined) {
          finalUpdateData.reasoning = response.reasoning
        }

        const updatedMessage = await updateMessage(messageId, finalUpdateData)

        // Send streaming end event with final message
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_END, {
          messageId,
          message: updatedMessage
        })

        finalMessage = updatedMessage
      }

      // Clean up the cancellation token
      cancellationManager.complete(messageId)

      // Call appropriate callback based on result
      if (wasCancelled) {
        // Treat cancellation as a special case that should still trigger callbacks
        // Use onError callback for cancellation since it's not a successful completion
        if (onError) {
          await onError(new Error('User cancelled'), finalMessage)
        }
      } else {
        // Call success callback for normal completion
        if (onSuccess) {
          await onSuccess(finalMessage)
        }
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)

      // Clean up the cancellation token
      cancellationManager.complete(messageId)

      // Check if streaming was cancelled during error
      const wasCancelled = cancellationToken.isCancelled

      let errorMessage: Message

      if (wasCancelled && streamingActive && (accumulatedText || accumulatedReasoning)) {
        console.log(
          'Error occurred during streaming after cancellation, preserving accumulated content'
        )

        // Preserve accumulated content even in error case if user cancelled
        const partialUpdateData: any = {
          content: [{ type: 'text' as const, text: accumulatedText || '\u200B' }]
        }

        if (accumulatedReasoning) {
          partialUpdateData.reasoning = accumulatedReasoning
        }

        errorMessage = await updateMessage(messageId, partialUpdateData)

        // Send streaming cancelled event instead of error
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, {
          messageId,
          message: errorMessage
        })
      } else {
        // Update message with error content
        const errorContent: MessageContent = [
          {
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : 'Failed to generate AI response. Please check your API configuration.'}`
          }
        ]

        errorMessage = await updateMessage(messageId, {
          content: errorContent
        })

        // Send streaming error event
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_ERROR, {
          messageId,
          message: errorMessage,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Call error callback if provided
      if (onError) {
        await onError(error instanceof Error ? error : new Error('Unknown error'), errorMessage)
      }
    }
  })
}

/**
 * Triggers automatic title generation if conditions are met
 * Called after assistant message completion/cancellation/error
 */
async function tryTriggerAutoTitleGeneration(conversationId: string): Promise<void> {
  try {
    // Check if automatic title generation should be triggered
    const totalMessages = await getMessages(conversationId)
    const { shouldTriggerAutoGeneration } = await import('./title-generation')

    if (shouldTriggerAutoGeneration(totalMessages)) {
      console.log(
        `Triggering automatic title generation for conversation ${conversationId} after first exchange`
      )

      const { generateTitleForConversation } = await import('./title-generation')
      const { updateConversation } = await import('./conversation')
      const { sendConversationEvent, CONVERSATION_EVENTS } = await import('../ipc/conversation')

      const title = await generateTitleForConversation(conversationId)

      // Only update if we got a meaningful title (not "New Chat")
      if (title && title !== 'New Chat') {
        await updateConversation(conversationId, { title })

        // Send title update event to renderer
        sendConversationEvent(CONVERSATION_EVENTS.TITLE_GENERATED, {
          conversationId,
          title
        })

        console.log(
          `Successfully auto-generated title for conversation ${conversationId}: "${title}"`
        )
      } else {
        console.log(
          `Skipping title update for conversation ${conversationId}: got fallback title "${title}"`
        )
      }
    } else {
      const userMessages = totalMessages.filter((m) => m.role === 'user')
      const assistantMessages = totalMessages.filter((m) => m.role === 'assistant')
      console.log(
        `Not triggering title generation: ${userMessages.length} user messages, ${assistantMessages.length} assistant messages`
      )
    }
  } catch (titleError) {
    console.error('Failed to automatically generate title:', titleError)
    // Don't fail the entire operation if title generation fails
  }
}

/**
 * Convenience function for generating assistant messages for new user messages
 * Automatically handles conversation context and title generation
 */
export async function generateReplyForNewMessage(
  messageId: string,
  conversationId: string
): Promise<void> {
  // Get all messages in the conversation for AI context
  const allMessages = await getMessages(conversationId)

  await streamAssistantReply({
    messageId,
    conversationId,
    contextMessages: allMessages,
    onSuccess: async (_updatedMessage) => {
      // Trigger title generation after successful completion
      await tryTriggerAutoTitleGeneration(conversationId)
    },
    onError: async (_error, _errorMessage) => {
      // Trigger title generation even after error/cancellation
      await tryTriggerAutoTitleGeneration(conversationId)
    }
  })
}

/**
 * Convenience function for regenerating assistant messages
 * Automatically handles context extraction up to the message being regenerated
 */
export async function regenerateReply(messageId: string): Promise<void> {
  const { getMessage } = await import('./message')

  // Get the message to regenerate
  const message = await getMessage(messageId)
  if (!message) {
    throw new Error('Message not found')
  }

  if (message.role !== 'assistant') {
    throw new Error('Can only regenerate assistant messages')
  }

  // Get conversation messages up to the point before this assistant message
  const allMessages = await getMessages(message.conversationId)
  const messageIndex = allMessages.findIndex((m) => m.id === messageId)
  const contextMessages = allMessages.slice(0, messageIndex)

  await streamAssistantReply({
    messageId,
    conversationId: message.conversationId,
    contextMessages
  })
}

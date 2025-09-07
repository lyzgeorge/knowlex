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

import type { Message, MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'
import { streamAIResponse } from '@main/services/openai-adapter'
import { updateMessage, getMessage } from '@main/services/message'
import { cancellationManager } from '@main/utils/cancellation'
import { sendMessageEvent, MESSAGE_EVENTS } from '@main/utils/ipc-events'
import { ensurePlaceholder } from '@shared/utils/text'

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
  /** Optional model configuration ID to use (overrides conversation default) */
  modelConfigId?: string | undefined
  /** Optional reasoning effort for this message */
  reasoningEffort?: ReasoningEffort | undefined
  /** Optional user default model ID for resolution */
  userDefaultModelId?: string | undefined
  /** Optional callback for when generation completes successfully */
  onSuccess?: (updatedMessage: Message) => Promise<void>
  /** Optional callback for when generation fails */
  onError?: (error: Error, errorMessage: Message) => Promise<void>
}

/**
 * Creates a batched emitter for streaming chunks to reduce IPC pressure
 * Eliminates duplication between text and reasoning chunk handling
 */
function createBatchedEmitter(
  messageId: string,
  eventType: string,
  chunkProperty: string,
  flushInterval: number = 16
) {
  let pendingChunk = ''
  let flushTimer: NodeJS.Timeout | null = null

  const flush = () => {
    if (pendingChunk.length > 0) {
      sendMessageEvent(eventType, {
        messageId,
        [chunkProperty]: pendingChunk
      })
      pendingChunk = ''
    }
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  const schedule = () => {
    if (flushTimer) return
    flushTimer = setTimeout(flush, flushInterval)
  }

  const addChunk = (chunk: string) => {
    pendingChunk += chunk
    schedule()
  }

  return { addChunk, flush }
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
  const {
    messageId,
    contextMessages,
    modelConfigId,
    reasoningEffort,
    userDefaultModelId,
    onSuccess,
    onError
  } = config

  // Create cancellation token for this streaming operation
  const cancellationToken = cancellationManager.createToken(messageId)

  // Send streaming start event
  sendMessageEvent(MESSAGE_EVENTS.STREAMING_START, {
    messageId,
    message: await updateMessage(messageId, {
      content: [{ type: 'text' as const, text: ensurePlaceholder('') }] // placeholder
    })
  })

  // Start background streaming process (don't await)
  setImmediate(async () => {
    // Track accumulated content for immediate DB writes
    let accumulatedText = ''
    let accumulatedReasoning = ''
    let streamingActive = true

    // Create batched emitters for IPC to reduce pressure
    const textEmitter = createBatchedEmitter(messageId, MESSAGE_EVENTS.STREAMING_CHUNK, 'chunk')
    const reasoningEmitter = createBatchedEmitter(
      messageId,
      MESSAGE_EVENTS.REASONING_CHUNK,
      'chunk'
    )

    try {
      // Get conversation model ID for resolution context
      let conversationModelId: string | undefined
      try {
        const { getConversation } = await import('@main/services/conversation')
        const conv = await getConversation(config.conversationId)
        conversationModelId = conv?.modelConfigId || undefined
      } catch (e) {
        // Non-fatal: conversation model resolution failed
        console.warn('[ASSISTANT] Failed to get conversation model ID:', e)
      }

      // Let openai-adapter handle model resolution with raw parameters
      const response = await streamAIResponse(
        contextMessages,
        {
          modelConfigId,
          conversationModelId,
          userDefaultModelId,
          ...(reasoningEffort !== undefined && { reasoningEffort }),
          onStart: () => {
            console.log('[ASSISTANT_GEN] Sending start event for message:', messageId)
            // Send start event for UI feedback (sparkle animation)
            sendMessageEvent(MESSAGE_EVENTS.START, {
              messageId
            })
          },
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

            // Batch IPC emissions by time to reduce pressure
            textEmitter.addChunk(chunk)
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

            // Batch IPC emissions by time to reduce pressure
            reasoningEmitter.addChunk(chunk)
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

      // Flush any pending IPC chunks before finishing
      textEmitter.flush()
      reasoningEmitter.flush()

      // Check if the operation was cancelled
      const wasCancelled = cancellationToken.isCancelled

      let finalMessage: Message

      if (wasCancelled) {
        console.log('Streaming cancelled, writing accumulated content to DB:', {
          textLength: accumulatedText.length,
          reasoningLength: accumulatedReasoning.length
        })

        // Write accumulated partial content immediately on cancellation
        const partialUpdateData: {
          content: Array<{ type: 'text'; text: string }>
          reasoning?: string
        } = {
          content: [{ type: 'text' as const, text: ensurePlaceholder(accumulatedText) }]
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
        const finalUpdateData: { content: any; reasoning?: string } = {
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

      // Flush any pending IPC chunks on error as well
      try {
        textEmitter.flush()
        reasoningEmitter.flush()
      } catch {
        // Ignore flush errors during cleanup
      }

      if (wasCancelled && streamingActive && (accumulatedText || accumulatedReasoning)) {
        console.log(
          'Error occurred during streaming after cancellation, preserving accumulated content'
        )

        // Preserve accumulated content even in error case if user cancelled
        const partialUpdateData: {
          content: Array<{ type: 'text'; text: string }>
          reasoning?: string
        } = {
          content: [{ type: 'text' as const, text: ensurePlaceholder(accumulatedText) }]
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
 * Convenience function for generating assistant messages for new user messages
 * Automatically handles conversation context and title generation
 */
export async function generateReplyForNewMessage(
  messageId: string,
  conversationId: string,
  reasoningEffort?: ReasoningEffort
): Promise<void> {
  // Build branch-scoped context (up to 5 messages) following parent chain
  const branchContext = await buildBranchContext(messageId, {
    includeCurrentAssistant: false,
    maxDepth: 5
  })

  // Shared title generation callback - runs regardless of success/error
  const handleTitleGeneration = async () => {
    // Attempt one-shot initial title generation (idempotent)
    const { attemptInitialTitleGeneration } = await import('./title-generation')
    await attemptInitialTitleGeneration(conversationId)
  }

  await streamAssistantReply({
    messageId,
    conversationId,
    contextMessages: branchContext,
    reasoningEffort,
    onSuccess: async (_updatedMessage) => {
      await handleTitleGeneration()
    },
    onError: async (_error, _errorMessage) => {
      await handleTitleGeneration()
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

  // Build branch-scoped context up to parent chain (exclude the assistant itself)
  const contextMessages = await buildBranchContext(messageId, {
    includeCurrentAssistant: false,
    maxDepth: 5
  })

  await streamAssistantReply({
    messageId,
    conversationId: message.conversationId,
    contextMessages
  })
}

// ----------------------------------------
// Branch context helper
// ----------------------------------------
interface BranchContextOptions {
  includeCurrentAssistant: boolean
  maxDepth: number
}

async function buildBranchContext(
  assistantMessageId: string,
  options: BranchContextOptions
): Promise<Message[]> {
  const { includeCurrentAssistant, maxDepth } = options
  const chain: Message[] = []

  let current = await getMessage(assistantMessageId)
  if (!current) return []

  // Optionally include the (placeholder) assistant; usually skipped because it has no content yet
  if (includeCurrentAssistant) chain.push(current)

  // Climb parent chain
  while (chain.length < maxDepth) {
    const parentId = current.parentMessageId
    if (!parentId) break
    const parent = await getMessage(parentId)
    if (!parent) break
    chain.push(parent)
    current = parent
  }

  // We collected from leaf upwards; reverse to chronological order (oldest -> newest)
  return chain.reverse()
}

/**
 * Title Generation Service
 *
 * Centralized service for automatic and manual conversation title generation.
 * Handles the complete lifecycle of title generation including trigger logic,
 * generation, updating conversation, and event emission.
 * Fallback to "New Chat" on any error to ensure reliability.
 */

import type { Message } from '@shared/types/message'
import { cancellationManager, CancellationToken } from '@main/utils/cancellation'

/**
 * Checks if automatic title generation should be triggered
 * @param messages - Array of conversation messages
 * @returns true if exactly one user message and one assistant message exist
 */
export function shouldTriggerAutoGeneration(messages: Message[]): boolean {
  if (!messages?.length) return false

  const userMessages = messages.filter((m) => m.role === 'user')
  const assistantMessages = messages.filter((m) => m.role === 'assistant')

  return userMessages.length === 1 && assistantMessages.length === 1
}

/**
 * Extracts text content from a message's content parts
 * @param message - Message to extract text from
 * @returns Combined text content, truncated for title generation
 */
function extractTextContent(message: Message, maxLength: number): string {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join(' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * Generates a conversation title using AI
 * @param conversationId - ID of the conversation to generate title for
 * @returns AI-generated title or "New Chat" on any failure
 */
export async function generateTitleForConversation(conversationId: string): Promise<string> {
  try {
    const { getMessages } = await import('@main/services/message')
    const messages = await getMessages(conversationId)

    if (messages.length < 2) {
      return 'New Chat'
    }

    // Validate AI configuration
    const { validateOpenAIConfig } = await import('@main/services/openai-adapter')
    const validation = validateOpenAIConfig()
    if (!validation.isValid) {
      return 'New Chat'
    }

    // Find first exchange
    const firstUserMessage = messages.find((m) => m.role === 'user')
    const firstAssistantMessage = messages.find((m) => m.role === 'assistant')

    if (!firstUserMessage || !firstAssistantMessage) {
      return 'New Chat'
    }

    // Extract text content with length limits
    const userContent = extractTextContent(firstUserMessage, 500)
    const assistantContent = extractTextContent(firstAssistantMessage, 1000)

    if (!userContent || !assistantContent) {
      return 'New Chat'
    }

    // Create title generation prompt
    const { generateAIResponseOnce } = await import('@main/services/openai-adapter')
    const titleMessages: Message[] = [
      {
        id: `title-gen-${Date.now()}-0`,
        conversationId: 'title-generation',
        role: 'system',
        content: [
          {
            type: 'text',
            text: 'Generate a concise 3-8 word title for this conversation. Return ONLY the title.'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: `title-gen-${Date.now()}-1`,
        conversationId: 'title-generation',
        role: 'user',
        content: [
          {
            type: 'text',
            text: `User: ${userContent}\n\nAssistant: ${assistantContent}`
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    // Create a scoped token so app shutdown or explicit cancellation can stop title generation
    const tokenId = `title-${conversationId}`
    const token: CancellationToken = cancellationManager.createToken(tokenId)

    // Currently generateAIResponseOnce does not accept a token; quick cancellation check loop pattern
    // If future refactor adds streaming/non-blocking version, integrate properly.
    if (token.isCancelled) return 'New Chat'
    const response = await generateAIResponseOnce(titleMessages)
    if (token.isCancelled) return 'New Chat'
    // Mark complete
    cancellationManager.complete(tokenId)

    // Clean and validate generated title
    const generatedTitle = response.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()
      .replace(/['"]/g, '') // Remove quotes
      .slice(0, 100) // Limit length

    return generatedTitle || 'New Chat'
  } catch (error) {
    console.error('Title generation failed:', error)
    return 'New Chat'
  }
}

/**
 * Triggers automatic title generation if conditions are met
 * Handles the complete process: check conditions, generate title, update conversation, emit events
 * @param conversationId - ID of the conversation to potentially generate title for
 */
export async function tryTriggerAutoTitleGeneration(conversationId: string): Promise<void> {
  try {
    // Check if automatic title generation should be triggered
    const { getMessages } = await import('./message')
    const totalMessages = await getMessages(conversationId)

    if (shouldTriggerAutoGeneration(totalMessages)) {
      console.log(
        `Triggering automatic title generation for conversation ${conversationId} after first exchange`
      )

      const title = await generateTitleForConversation(conversationId)

      // Only update if we got a meaningful title (not "New Chat")
      if (title && title !== 'New Chat') {
        const { updateConversation } = await import('@main/services/conversation')
        const { sendConversationEvent, CONVERSATION_EVENTS } = await import(
          '@main/ipc/conversation'
        )

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
 * Allows external callers (e.g., when a conversation is deleted) to cancel an in-flight
 * title generation task to avoid wasted AI calls.
 */
export function cancelTitleGeneration(conversationId: string): void {
  cancellationManager.cancel(`title-${conversationId}`)
  cancellationManager.complete(`title-${conversationId}`)
}

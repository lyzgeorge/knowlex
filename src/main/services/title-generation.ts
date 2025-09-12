/**
 * Title Generation Service
 *
 * Centralized service for automatic and manual conversation title generation.
 * Handles the complete lifecycle of title generation including trigger logic,
 * generation, updating conversation, and event emission.
 * Fallback to "New Chat" on any error to ensure reliability.
 */

import type { Message } from '@shared/types/message'
import { extractTextContent as extractMessageTextContent } from './message'

// Placeholder titles we consider "unset". Extendable without DB changes.
const PLACEHOLDER_TITLES = new Set(['New Chat', 'Untitled'])

export function isPlaceholderTitle(title: string | null | undefined): boolean {
  if (!title) return true
  return PLACEHOLDER_TITLES.has(title.trim())
}

/**
 * Extracts text content from a message's content parts for title generation
 * Reuses the standard extractTextContent function with title-specific formatting
 * @param message - Message to extract text from
 * @param maxLength - Maximum length to truncate to
 * @returns Combined text content, truncated for title generation
 */
function extractTextContent(message: Message, maxLength: number): string {
  // Use the standard message text extraction, then format for titles
  return extractMessageTextContent(message)
    .replace(/\n/g, ' ') // Convert newlines to spaces for title format
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

    const response = await generateAIResponseOnce(titleMessages)

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
 * One-shot automatic title attempt.
 * Safe to call multiple times; exits fast unless ALL are true:
 *  - Conversation exists
 *  - Title still placeholder
 *  - Exactly one user and one assistant message present (first exchange complete)
 * On success: updates conversation title & emits TITLE_GENERATED.
 */
export async function attemptInitialTitleGeneration(conversationId: string): Promise<void> {
  try {
    const { getConversation, updateConversation } = await import(
      '@main/services/conversation-service'
    )
    const conversation = await getConversation(conversationId)
    if (!conversation) return
    if (!isPlaceholderTitle(conversation.title)) return // Already set by user or previous auto gen

    // Fetch messages (reuse existing service; small overhead acceptable for single invocation)
    const { getMessages } = await import('@main/services/message')
    const messages = await getMessages(conversationId)
    // Require exactly one user + one assistant (first exchange complete)
    const userCount = messages.filter((m) => m.role === 'user').length
    const assistantCount = messages.filter((m) => m.role === 'assistant').length
    if (!(userCount === 1 && assistantCount === 1)) return

    const title = await generateTitleForConversation(conversationId)
    if (!title || isPlaceholderTitle(title) || title === 'New Chat') return

    await updateConversation(conversationId, { title })
    const { sendConversationEvent, CONVERSATION_EVENTS } = await import('@main/utils/ipc-events')
    sendConversationEvent(CONVERSATION_EVENTS.TITLE_GENERATED, { conversationId, title })
    console.log(`[TITLE] Auto-generated initial title for ${conversationId}: "${title}"`)
  } catch (err) {
    console.error('[TITLE] attemptInitialTitleGeneration failed:', err)
  }
}

/**
 * Allows external callers (e.g., when a conversation is deleted) to cancel an in-flight
 * title generation task to avoid wasted AI calls.
 */

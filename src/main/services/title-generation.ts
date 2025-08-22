/**
 * Title Generation Service
 *
 * Automatically generates conversation titles based on the first user-assistant exchange.
 * Fallback to "New Chat" on any error to ensure reliability.
 */

import type { Message } from '../../shared/types/message'

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
    const { getMessages } = await import('./message')
    const messages = await getMessages(conversationId)

    if (messages.length < 2) {
      return 'New Chat'
    }

    // Validate AI configuration
    const { validateOpenAIConfig } = await import('./openai-adapter')
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
    const { generateAIResponseOnce } = await import('./openai-adapter')
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

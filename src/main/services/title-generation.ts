/**
 * Title Generation Service
 *
 * Simple service for generating conversation titles using AI.
 * If anything fails, just return "New Chat".
 */

import type { Message } from '../../shared/types/message'

/**
 * Determines if automatic title generation should be triggered
 */
export function shouldTriggerAutoGeneration(messages: Message[]): boolean {
  if (!messages || messages.length === 0) return false

  const userMessages = messages.filter((m) => m.role === 'user')
  const assistantMessages = messages.filter((m) => m.role === 'assistant')

  // Only trigger for first complete exchange
  return userMessages.length === 1 && assistantMessages.length === 1
}

/**
 * Generates title for a conversation by ID
 * Returns AI-generated title or "New Chat" if anything fails
 */
export async function generateTitleForConversation(conversationId: string): Promise<string> {
  try {
    const { getMessages } = await import('./message')
    const messages = await getMessages(conversationId)

    if (messages.length < 2) {
      return 'New Chat'
    }

    // Check if AI is configured
    const { validateAIConfiguration } = await import('./ai-chat-vercel')
    const validation = validateAIConfiguration()
    if (!validation.isValid) {
      return 'New Chat'
    }

    // Get first user and assistant messages
    const firstUserMessage = messages.find((m) => m.role === 'user')
    const firstAssistantMessage = messages.find((m) => m.role === 'assistant')

    if (!firstUserMessage || !firstAssistantMessage) {
      return 'New Chat'
    }

    // Extract text content
    const userContent = firstUserMessage.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()

    const assistantContent = firstAssistantMessage.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()

    if (!userContent || !assistantContent) {
      return 'New Chat'
    }

    // Generate title using AI
    const { generateAIResponse } = await import('./ai-chat-vercel')

    const titlePrompt = [
      {
        role: 'system' as const,
        content: 'Generate a concise 3-8 word title for this conversation. Return ONLY the title.'
      },
      {
        role: 'user' as const,
        content: `User: ${userContent.slice(0, 500)}\n\nAssistant: ${assistantContent.slice(0, 1000)}`
      }
    ]

    const response = await generateAIResponse(
      titlePrompt.map((msg, index) => ({
        id: `title-gen-${Date.now()}-${index}`,
        conversationId: 'title-generation',
        role: msg.role === 'system' ? 'user' : msg.role,
        content: [
          {
            type: 'text' as const,
            text: msg.role === 'system' ? `System: ${msg.content}` : msg.content
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    )

    const generatedTitle = response.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join(' ')
      .trim()
      .replace(/['"]/g, '')
      .slice(0, 100)

    // Return generated title or fallback
    return generatedTitle && generatedTitle.length > 0 ? generatedTitle : 'New Chat'
  } catch (error) {
    console.error('Title generation failed:', error)
    return 'New Chat'
  }
}

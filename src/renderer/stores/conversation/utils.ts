/**
 * Conversation Store Utilities
 * Helper functions for common operations
 */

import type { Conversation } from '@shared/types/conversation'
import type { MessageContent } from '@shared/types/message'

const nowISO = () => new Date().toISOString()

/**
 * Deduplicates items by ID
 */
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

/**
 * Checks if message content has meaningful data
 */
export function hasMeaningfulContent(parts: MessageContent): boolean {
  return parts.some(
    (p) =>
      (p.type === 'text' && !!p.text?.trim()) ||
      (p.type === 'temporary-file' && !!p.temporaryFile) ||
      (p.type === 'image' && !!p.image) ||
      (p.type === 'citation' && !!p.citation) ||
      (p.type === 'tool-call' && !!p.toolCall)
  )
}

/**
 * Updates a conversation with automatic timestamp
 */
export function updateConversation(
  conversations: Conversation[],
  conversationId: string,
  mutator: (conversation: Conversation) => void
): boolean {
  const conversation = conversations.find((c) => c.id === conversationId)
  if (!conversation) return false

  mutator(conversation)
  conversation.updatedAt = nowISO()
  return true
}

/**
 * Gets empty messages array (reused to prevent unnecessary re-renders)
 */
// EMPTY_MESSAGES should be a mutable Message[] to satisfy callers that may push/modify
export const EMPTY_MESSAGES: any[] = []

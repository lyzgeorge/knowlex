/**
 * Consolidated utils: constants + async helpers + utility functions
 */

import type { Conversation } from '@shared/types/conversation-types'
import type { MessageContent } from '@shared/types/message'
import { TEXT_CONSTANTS } from '@shared/constants/text'

// --- constants ---
export const CONVERSATION_CONSTANTS = {
  CONVERSATIONS_PAGE_SIZE: 15,
  TEXT_CHUNK_FLUSH_INTERVAL: 16,
  REASONING_CHUNK_FLUSH_INTERVAL: 16,
  ZERO_WIDTH_SPACE: TEXT_CONSTANTS.ZERO_WIDTH_SPACE,
  DEFAULT_CONVERSATION_TITLE: 'New Chat'
} as const

// --- time helper ---
export const nowISO = () => new Date().toISOString()

// --- dedupe / validation ---
export function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

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

// --- conversation helpers ---
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

// Unified conversation timestamp update functions
export function updateConversationTimestamp(
  conversations: Conversation[],
  conversationId: string,
  timestamp?: string
) {
  const conversation = conversations.find((c) => c.id === conversationId)
  if (!conversation) return false
  conversation.updatedAt = timestamp || nowISO()
  return true
}

export function updateConversationTimestampFromMessage(
  conversations: Conversation[],
  conversationId: string,
  message?: { updatedAt?: string; createdAt?: string } | null
) {
  const timestamp = message?.updatedAt || message?.createdAt || nowISO()
  return updateConversationTimestamp(conversations, conversationId, timestamp)
}

export function updateConversationTimestampByMessageId(draft: any, messageId: string) {
  const idx = draft.messageIndex?.[messageId]
  if (!idx) return false
  const msg = draft.messages?.[idx.conversationId]?.[idx.idx]
  const timestamp = msg?.updatedAt || msg?.createdAt || nowISO()
  return updateConversationTimestamp(draft.conversations, idx.conversationId, timestamp)
}

export function clearStreamingFlagsForMessage(draft: any, messageId: string) {
  if (draft.streamingMessageId === messageId) {
    draft.isStreaming = false
    draft.streamingMessageId = null
  }
  if (draft.reasoningStreamingMessageId === messageId) {
    draft.isReasoningStreaming = false
    draft.reasoningStreamingMessageId = null
  }
  if (draft.startStreamingMessageId === messageId) {
    draft.isStartStreaming = false
    draft.startStreamingMessageId = null
  }
  if (draft.textStreamingMessageId === messageId) {
    draft.isTextStreaming = false
    draft.textStreamingMessageId = null
  }
}

export const EMPTY_MESSAGES: any[] = []

/**
 * Consolidated utils: constants + async helpers + utility functions
 */

import type { Conversation } from '@shared/types/conversation'
import type { MessageContent } from '@shared/types/message'
import type { Draft } from 'immer'

// --- constants ---
export const CONVERSATION_CONSTANTS = {
  CONVERSATIONS_PAGE_SIZE: 15,
  TEXT_CHUNK_FLUSH_INTERVAL: 16,
  REASONING_CHUNK_FLUSH_INTERVAL: 16,
  ZERO_WIDTH_SPACE: '\u200B',
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

// --- async-utils (runAsync + loadingSetters) ---
export interface AsyncOperationOptions<T> {
  setLoading?: ((loading: boolean) => (draft: any) => void) | undefined
  onError?: (error: string) => void
  onSuccess?: (result: T) => void
}

export async function runAsync<T>(
  set: (updater: (draft: Draft<any>) => void) => void,
  operation: () => Promise<T>,
  options: AsyncOperationOptions<T> = {}
): Promise<T> {
  const { setLoading, onError, onSuccess } = options

  if (setLoading) {
    set(setLoading(true))
  }
  set((s) => {
    s.error = null
  })

  try {
    const result = await operation()

    if (onSuccess) {
      onSuccess(result)
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Operation failed'

    if (onError) {
      onError(errorMessage)
    } else {
      set((s) => {
        s.error = errorMessage
      })
    }

    throw error
  } finally {
    if (setLoading) {
      set(setLoading(false))
    }
  }
}

export function createLoadingSetter(property: string) {
  return (loading: boolean) => (draft: any) => {
    draft[property] = loading
  }
}

export const loadingSetters = {
  isLoading: createLoadingSetter('isLoading'),
  isLoadingMessages: createLoadingSetter('isLoadingMessages'),
  isSending: createLoadingSetter('isSending'),
  isLoadingMore: createLoadingSetter('isLoadingMore')
}

// Helper for common API call pattern with error handling
export async function runApiCall<T = void>(
  set: (updater: (draft: Draft<any>) => void) => void,
  apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>,
  errorMessage: string,
  onSuccess?: (data: T | undefined) => void,
  options: AsyncOperationOptions<any> = {}
): Promise<void> {
  return runAsync(
    set,
    async () => {
      const res = await apiCall()
      if (!res?.success) {
        throw new Error(res?.error || errorMessage)
      }
      if (onSuccess) {
        onSuccess(res.data)
      }
    },
    options
  )
}

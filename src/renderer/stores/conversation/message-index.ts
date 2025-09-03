/**
 * Message Indexing Utilities
 * Provides efficient O(1) message lookup and atomic index management
 */

import type { Message } from '@shared/types/message'

export interface MessageIndex {
  conversationId: string
  idx: number
}

export interface MessageStore {
  messages: Record<string, Message[]>
  messageIndex: Record<string, MessageIndex>
}

/**
 * Sorts messages by createdAt timestamp (ascending)
 */
function sortByCreatedAtAsc(a: { createdAt?: string }, b: { createdAt?: string }) {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
  return ta - tb
}

/**
 * Rebuilds the message index for a specific conversation
 */
export function rebuildMessageIndex(store: MessageStore, conversationId: string): void {
  const messages = store.messages[conversationId]
  if (!messages) return

  messages.forEach((message, idx) => {
    store.messageIndex[message.id] = { conversationId, idx }
  })
}

/**
 * Ingests messages for a conversation with automatic sorting and indexing
 */
export function ingestMessages(
  store: MessageStore,
  conversationId: string,
  newMessages: Message[],
  options: { replace?: boolean } = {}
): void {
  const { replace = false } = options

  if (replace || !store.messages[conversationId]) {
    // Full replace or new conversation
    store.messages[conversationId] = [...newMessages]
  } else {
    // Merge with existing messages, avoiding duplicates
    const existing = store.messages[conversationId]
    const existingIds = new Set(existing.map((m) => m.id))
    const toAdd = newMessages.filter((m) => !existingIds.has(m.id))
    store.messages[conversationId] = [...existing, ...toAdd]
  }

  // Sort and rebuild index
  const messages = store.messages[conversationId]
  messages.sort(sortByCreatedAtAsc)

  // Clear old indices for this conversation
  Object.keys(store.messageIndex).forEach((messageId) => {
    if (store.messageIndex[messageId]?.conversationId === conversationId) {
      delete store.messageIndex[messageId]
    }
  })

  // Rebuild index
  rebuildMessageIndex(store, conversationId)
}

/**
 * Adds a single message with smart insertion (binary search if out of order)
 */
export function addMessage(store: MessageStore, conversationId: string, message: Message): void {
  if (!store.messages[conversationId]) {
    store.messages[conversationId] = []
  }

  const messages = store.messages[conversationId]
  const existingIndex = messages.findIndex((m) => m.id === message.id)

  if (existingIndex !== -1) {
    // Update existing message
    messages[existingIndex] = message
    rebuildMessageIndex(store, conversationId)
    return
  }

  // Check if we can append (most common case for new messages)
  const lastMessage = messages[messages.length - 1]
  const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : Date.now()
  const lastTime = lastMessage?.createdAt ? new Date(lastMessage.createdAt).getTime() : 0

  if (!lastMessage || messageTime >= lastTime) {
    // Can append - this is the fast path
    const newIndex = messages.length
    messages.push(message)
    store.messageIndex[message.id] = { conversationId, idx: newIndex }
  } else {
    // Need to insert in order - use binary search
    let left = 0
    let right = messages.length

    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      const midMsg = messages[mid]
      const midTime = midMsg && midMsg.createdAt ? new Date(midMsg.createdAt).getTime() : 0

      if (midTime <= messageTime) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    messages.splice(left, 0, message)
    rebuildMessageIndex(store, conversationId)
  }
}

/**
 * Removes a message and updates indices
 */
export function removeMessage(store: MessageStore, messageId: string): void {
  const index = store.messageIndex[messageId]
  if (!index) return

  const messages = store.messages[index.conversationId]
  if (!messages) return

  messages.splice(index.idx, 1)
  delete store.messageIndex[messageId]
  rebuildMessageIndex(store, index.conversationId)
}

/**
 * Gets a message by ID with O(1) lookup
 */
export function getMessage(store: MessageStore, messageId: string): Message | null {
  const index = store.messageIndex[messageId]
  if (!index) return null

  return store.messages[index.conversationId]?.[index.idx] || null
}

/**
 * Updates a message in place
 */
export function updateMessage(
  store: MessageStore,
  messageId: string,
  updater: (message: Message) => void
): void {
  const index = store.messageIndex[messageId]
  if (!index) return

  const message = store.messages[index.conversationId]?.[index.idx]
  if (!message) return

  updater(message)
  message.updatedAt = new Date().toISOString()
}

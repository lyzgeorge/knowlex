/*
 * Conversation data layer (skeleton)
 * Exposes the existing API and index utilities by re-exporting current files.
 * We'll migrate `api.ts`, `message-index.ts`, and `message-preload.ts` into here.
 */

/**
 * Consolidated data layer for conversation store
 * Exposes conversationApi, messageApi, and message/indexing utilities.
 */

// --- api ---
import type { Conversation, SessionSettings } from '@shared/types/conversation-types'
import type { Message, MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'

export interface ConversationApiInterface {
  create(params: {
    title?: string
  }): Promise<{ success: boolean; data?: Conversation; error?: string }>
  update(params: {
    id: string
    modelConfigId?: string
  }): Promise<{ success: boolean; error?: string }>
  delete(conversationId: string): Promise<{ success: boolean; error?: string }>
  updateTitle(conversationId: string, title: string): Promise<{ success: boolean; error?: string }>
  generateTitle(
    conversationId: string
  ): Promise<{ success: boolean; data?: string; error?: string }>
  move(
    conversationId: string,
    projectId: string | null
  ): Promise<{ success: boolean; error?: string }>
  updateSettings(
    conversationId: string,
    settings: Partial<SessionSettings>
  ): Promise<{ success: boolean; error?: string }>
  listPaginated(params: { limit: number; offset: number }): Promise<{
    success: boolean
    data?: { conversations: Conversation[]; hasMore: boolean }
    error?: string
  }>
}

export interface MessageApiInterface {
  send(params: {
    conversationId?: string
    parentMessageId?: string
    projectId?: string
    reasoningEffort?: ReasoningEffort
    modelConfigId?: string
    content: MessageContent
  }): Promise<{ success: boolean; error?: string }>
  regenerate(messageId: string): Promise<void>
  edit(messageId: string, content: MessageContent): Promise<void>
  delete(messageId: string): Promise<void>
  stop(messageId: string): Promise<void>
  list(conversationId: string): Promise<{ success: boolean; data?: Message[]; error?: string }>
}

export const conversationApi: ConversationApiInterface = {
  create: (params) => window.knowlex.conversation.create(params) as Promise<any>,
  update: (params) => window.knowlex.conversation.update(params) as Promise<any>,
  delete: (conversationId) => window.knowlex.conversation.delete(conversationId) as Promise<any>,
  updateTitle: (conversationId, title) =>
    window.knowlex.conversation.update({ id: conversationId, title }) as Promise<any>,
  generateTitle: (conversationId) =>
    window.knowlex.conversation.generateTitle(conversationId) as Promise<any>,
  move: (conversationId, projectId) =>
    window.knowlex.conversation.move(conversationId, projectId) as Promise<any>,
  updateSettings: (conversationId, settings) =>
    window.knowlex.conversation.updateSettings(conversationId, settings) as Promise<any>,
  listPaginated: (params) => window.knowlex.conversation.listPaginated(params) as Promise<any>
}

export const messageApi: MessageApiInterface = {
  send: (params) => window.knowlex.message.send(params) as Promise<any>,
  regenerate: (messageId) => window.knowlex.message.regenerate(messageId) as Promise<any>,
  edit: (messageId, content) => window.knowlex.message.update(messageId, content) as Promise<any>,
  delete: (messageId) => window.knowlex.message.delete(messageId) as Promise<any>,
  stop: (messageId) => window.knowlex.message.stop(messageId) as Promise<any>,
  list: (conversationId) => window.knowlex.message.list(conversationId) as Promise<any>
}

// --- message-index ---
export interface MessageIndex {
  conversationId: string
  idx: number
}

export interface MessageStore {
  messages: Record<string, Message[]>
  messageIndex: Record<string, MessageIndex>
}

function sortByCreatedAtAsc(a: { createdAt?: string }, b: { createdAt?: string }) {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
  return ta - tb
}

// Find the insertion index for a message given its createdAt time using binary search
function findInsertIndexByCreatedAt(messages: Message[], createdAt?: string): number {
  const t = createdAt ? new Date(createdAt).getTime() : 0
  let left = 0
  let right = messages.length
  while (left < right) {
    const mid = Math.floor((left + right) / 2)
    const midTime = messages[mid]?.createdAt ? new Date(messages[mid]!.createdAt!).getTime() : 0
    if (midTime <= t) left = mid + 1
    else right = mid
  }
  return left
}

export function rebuildMessageIndex(store: MessageStore, conversationId: string): void {
  const messages = store.messages[conversationId]
  if (!messages) return

  messages.forEach((message, idx) => {
    store.messageIndex[message.id] = { conversationId, idx }
  })
}

export function ingestMessages(
  store: MessageStore,
  conversationId: string,
  newMessages: Message[],
  options: { replace?: boolean } = {}
): void {
  const { replace = false } = options

  if (replace || !store.messages[conversationId]) {
    store.messages[conversationId] = [...newMessages]
  } else {
    const existing = store.messages[conversationId]
    const existingIds = new Set(existing.map((m) => m.id))
    const toAdd = newMessages.filter((m) => !existingIds.has(m.id))
    store.messages[conversationId] = [...existing, ...toAdd]
  }

  const messages = store.messages[conversationId]
  messages.sort(sortByCreatedAtAsc)

  Object.keys(store.messageIndex).forEach((messageId) => {
    if (store.messageIndex[messageId]?.conversationId === conversationId) {
      delete store.messageIndex[messageId]
    }
  })

  rebuildMessageIndex(store, conversationId)
}

export function addMessage(store: MessageStore, conversationId: string, message: Message): void {
  if (!store.messages[conversationId]) {
    store.messages[conversationId] = []
  }

  const messages = store.messages[conversationId]
  const existingIndex = messages.findIndex((m) => m.id === message.id)

  if (existingIndex !== -1) {
    messages[existingIndex] = message
    rebuildMessageIndex(store, conversationId)
    return
  }

  const lastMessage = messages[messages.length - 1]
  const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : Date.now()
  const lastTime = lastMessage?.createdAt ? new Date(lastMessage.createdAt).getTime() : 0

  if (!lastMessage || messageTime >= lastTime) {
    const newIndex = messages.length
    messages.push(message)
    store.messageIndex[message.id] = { conversationId, idx: newIndex }
  } else {
    const insertAt = findInsertIndexByCreatedAt(messages, message.createdAt)
    messages.splice(insertAt, 0, message)
    rebuildMessageIndex(store, conversationId)
  }
}

export function removeMessage(store: MessageStore, messageId: string): void {
  const index = store.messageIndex[messageId]
  if (!index) return

  const messages = store.messages[index.conversationId]
  if (!messages) return

  messages.splice(index.idx, 1)
  delete store.messageIndex[messageId]
  rebuildMessageIndex(store, index.conversationId)
}

export function getMessage(store: MessageStore, messageId: string): Message | null {
  const index = store.messageIndex[messageId]
  if (!index) return null

  return store.messages[index.conversationId]?.[index.idx] || null
}

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

// --- message-preload (inlined) ---
import { updateConversationTimestampFromMessage } from './utils'
export async function preloadAndIndexMessagesFor(
  conversations: Conversation[],
  applyToDraft: (apply: (updater: (draft: any) => void) => void) => void
) {
  await Promise.allSettled(
    conversations.map(async (conv) => {
      try {
        const messageRes = await messageApi.list(conv.id)
        if (messageRes?.success) {
          const msgs = (messageRes.data as Message[]) || []
          applyToDraft((apply) => {
            apply((s: any) => {
              ingestMessages(s, conv.id, msgs, { replace: true })
              if (msgs.length) {
                const last = msgs[msgs.length - 1]
                updateConversationTimestampFromMessage(s.conversations, conv.id, last)
              }
            })
          })
        }
      } catch (e) {
        console.warn(`Failed to preload messages for conversation ${conv.id}:`, e)
      }
    })
  )
}

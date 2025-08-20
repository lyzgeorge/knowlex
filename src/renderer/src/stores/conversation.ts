/**
 * Conversation store (lean refactor)
 * - Keeps public API backward-compatible
 * - Adds O(1) message lookup via index
 * - DRYs event wiring
 * - Trims logs/comments
 */

import React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Conversation, SessionSettings } from '../../../shared/types/conversation'
import type { Message, MessageContent } from '../../../shared/types/message'

const EMPTY_MESSAGES: Message[] = []
const nowISO = () => new Date().toISOString()
const DEBUG = false

// ----------------------------------------
// Internal helpers
// ----------------------------------------
function hasMeaningfulContent(parts: MessageContent) {
  return parts.some(
    (p) =>
      (p.type === 'text' && !!p.text?.trim()) ||
      (p.type === 'temporary-file' && !!p.temporaryFile) ||
      (p.type === 'image' && !!p.image) ||
      (p.type === 'citation' && !!p.citation) ||
      (p.type === 'tool-call' && !!p.toolCall)
  )
}

// ----------------------------------------
// Store types
// ----------------------------------------
export interface ConversationState {
  conversations: Conversation[]
  messages: Record<string, Message[]> // conversationId -> messages
  currentConversationId: string | null

  // Streaming state
  isStreaming: boolean
  streamingMessageId: string | null
  isTextStreaming: boolean
  textStreamingMessageId: string | null

  // Reasoning streaming state
  isReasoningStreaming: boolean
  reasoningStreamingMessageId: string | null

  // Loading & error
  isLoading: boolean
  isLoadingMessages: boolean
  isSending: boolean
  error: string | null

  // O(1) message index: messageId -> { conversationId, idx }
  _msgIndex: Record<string, { conversationId: string; idx: number }>

  // Conversation ops
  createConversation: (title?: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>
  generateConversationTitle: (conversationId: string) => Promise<void>

  // Session settings
  updateSessionSettings: (
    conversationId: string,
    settings: Partial<SessionSettings>
  ) => Promise<void>

  // Message ops
  sendMessage: (
    content: MessageContent,
    files?: File[],
    options?: { conversationId?: string }
  ) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  editMessage: (messageId: string, content: MessageContent) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>

  // Loading
  loadMessages: (conversationId: string) => Promise<void>

  // Selection & navigation
  setCurrentConversation: (conversationId: string | null) => void
  getCurrentConversation: () => Conversation | null
  getCurrentMessages: () => Message[]

  // Streaming support
  onStreamingUpdate: (messageId: string, chunk: string) => void
  setStreamingState: (isStreaming: boolean, messageId?: string) => void
  stopStreaming: (messageId: string) => Promise<void>

  // Utilities
  clearError: () => void
  reset: () => void
  initialize: () => Promise<void>
}

const initialState: Pick<
  ConversationState,
  | 'conversations'
  | 'messages'
  | 'currentConversationId'
  | 'isStreaming'
  | 'streamingMessageId'
  | 'isTextStreaming'
  | 'textStreamingMessageId'
  | 'isReasoningStreaming'
  | 'reasoningStreamingMessageId'
  | 'isLoading'
  | 'isLoadingMessages'
  | 'isSending'
  | 'error'
  | '_msgIndex'
> = {
  conversations: [],
  messages: {},
  currentConversationId: null,
  isStreaming: false,
  streamingMessageId: null,
  isTextStreaming: false,
  textStreamingMessageId: null,
  isReasoningStreaming: false,
  reasoningStreamingMessageId: null,
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  error: null,
  _msgIndex: {}
}

// StrictMode dedupe
let eventListenersSetup = false

// ----------------------------------------
// Event wiring (DRY)
// ----------------------------------------
function setupEventListeners() {
  if (eventListenersSetup) return
  eventListenersSetup = true
  const on = window.knowlex?.events?.on
  if (!on) return

  const setState = useConversationStore.setState

  const log = (...args: any[]) => DEBUG && console.log('[STORE]', ...args)

  on('conversation:created', (_, d: any) => {
    if (!d?.id) return
    setState((s) => {
      // Add new conversation if it doesn't exist
      if (!s.conversations.find((c) => c.id === d.id)) {
        s.conversations.unshift(d) // Add to beginning for newest-first ordering
        s.messages[d.id] = [] // Initialize empty messages array
      }
    })
  })

  on('conversation:title_generated', (_, d: any) => {
    if (!d?.conversationId || !d?.title) return
    setState((s) => {
      const c = s.conversations.find((x) => x.id === d.conversationId)
      if (c) {
        c.title = d.title
        c.updatedAt = nowISO()
      }
    })
  })

  on('message:added', (_, d: any) => {
    if (!d?.id || !d?.conversationId) return
    setState((s) => {
      const list = (s.messages[d.conversationId] ||= [])
      if (!list.some((m) => m.id === d.id)) {
        s._msgIndex[d.id] = { conversationId: d.conversationId, idx: list.length }
        list.push(d as Message)
      }
      if (!s.currentConversationId) s.currentConversationId = d.conversationId
    })
  })

  on('conversation:updated', (_, _d: any) => {
    // reserved for future use
  })

  on('message:streaming_start', (_, d: any) => {
    if (!d?.messageId || !d?.message) return
    setState((s) => {
      s.isStreaming = true
      s.streamingMessageId = d.messageId

      const cid = d.message.conversationId
      const arr = (s.messages[cid] ||= [])

      // don't force-switch if user is on another convo
      if (!s.currentConversationId) s.currentConversationId = cid

      const idx = arr.findIndex((m) => m.id === d.messageId)
      if (idx === -1) {
        s._msgIndex[d.messageId] = { conversationId: cid, idx: arr.length }
        arr.push(d.message)
      } else {
        arr[idx] = d.message
        s._msgIndex[d.messageId] = { conversationId: cid, idx }
      }
    })
  })

  on('message:streaming_chunk', (_, d: any) => {
    if (!d?.messageId || !d?.chunk) return
    setState((s) => {
      if (!s.isTextStreaming || s.textStreamingMessageId !== d.messageId) {
        s.isTextStreaming = true
        s.textStreamingMessageId = d.messageId
      }
      const idx = s._msgIndex[d.messageId]
      if (!idx) return
      const msg = s.messages[idx.conversationId]?.[idx.idx]
      if (!msg) return
      const last = msg.content[msg.content.length - 1]
      if (last?.type === 'text') {
        last.text = (last.text === '\u200B' ? '' : last.text || '') + d.chunk
      } else {
        msg.content.push({ type: 'text', text: d.chunk })
      }
      msg.updatedAt = nowISO()
      log('chunk ->', d.messageId)
    })
  })

  on('message:streaming_end', (_, d: any) => {
    if (!d?.messageId || !d?.message) return
    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null
      s.isTextStreaming = false
      s.textStreamingMessageId = null

      const idx = s._msgIndex[d.messageId]
      if (!idx) return
      const arr = s.messages[idx.conversationId]
      if (!arr) return
      const current = arr[idx.idx]
      const finalMsg = d.message as Message
      if (current?.reasoning && !finalMsg.reasoning) finalMsg.reasoning = current.reasoning
      arr[idx.idx] = finalMsg
    })
  })

  on('message:streaming_error', (_, d: any) => {
    if (!d?.messageId || !d?.message) return
    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null
      const idx = s._msgIndex[d.messageId]
      if (!idx) return
      const arr = s.messages[idx.conversationId]
      if (!arr) return
      arr[idx.idx] = d.message
      s.error = d.error || 'Streaming failed'
    })
  })

  on('message:streaming_cancelled', (_, d: any) => {
    if (!d?.messageId) return
    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null
      const idx = s._msgIndex[d.messageId]
      if (!idx || !d.message) return
      const arr = s.messages[idx.conversationId]
      if (!arr) return
      const current = arr[idx.idx]
      const partial = d.message as Message
      if (current?.reasoning && !partial.reasoning) partial.reasoning = current.reasoning
      arr[idx.idx] = partial
    })
  })

  on('message:reasoning_start', (_, d: any) => {
    if (!d?.messageId) return
    setState((s) => {
      s.isReasoningStreaming = true
      s.reasoningStreamingMessageId = d.messageId
      const idx = s._msgIndex[d.messageId]
      if (!idx) return
      const msg = s.messages[idx.conversationId]?.[idx.idx]
      if (msg && !msg.reasoning) msg.reasoning = ''
    })
  })

  on('message:reasoning_chunk', (_, d: any) => {
    if (!d?.messageId || !d?.chunk) return
    setState((s) => {
      const idx = s._msgIndex[d.messageId]
      if (!idx) return
      const msg = s.messages[idx.conversationId]?.[idx.idx]
      if (!msg) return
      msg.reasoning = (msg.reasoning || '') + d.chunk
      msg.updatedAt = nowISO()
    })
  })

  on('message:reasoning_end', (_, d: any) => {
    if (!d?.messageId) return
    setState((s) => {
      s.isReasoningStreaming = false
      s.reasoningStreamingMessageId = null
      const idx = s._msgIndex[d.messageId]
      if (!idx) return
      const msg = s.messages[idx.conversationId]?.[idx.idx]
      if (msg) msg.updatedAt = nowISO()
    })
  })
}

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => ({
    ...initialState,

    // Conversations
    createConversation: async (title?: string) => {
      set((s) => {
        s.isLoading = true
        s.error = null
      })
      try {
        const res = await window.knowlex.conversation.create({ title: title || 'New Chat' })
        if (!res?.success || !res.data)
          throw new Error(res?.error || 'Failed to create conversation')
        const conv = res.data as Conversation
        set((s) => {
          s.conversations.push(conv)
          s.currentConversationId = conv.id
          s.messages[conv.id] = []
          s.isLoading = false
        })
        return conv
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to create conversation'
          s.isLoading = false
        })
        throw e
      }
    },

    deleteConversation: async (conversationId: string) => {
      try {
        const res = await window.knowlex.conversation.delete(conversationId)
        if (!res?.success) throw new Error(res?.error || 'Failed to delete conversation')
        set((s) => {
          const msgs = s.messages[conversationId] || []
          msgs.forEach((m) => {
            delete s._msgIndex[m.id]
          })
          delete s.messages[conversationId]
          s.conversations = s.conversations.filter((c) => c.id !== conversationId)
          if (s.currentConversationId === conversationId) s.currentConversationId = null
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to delete conversation'
        })
        throw e
      }
    },

    updateConversationTitle: async (conversationId: string, title: string) => {
      try {
        await window.knowlex.conversation.updateTitle(conversationId, title)
        set((s) => {
          const c = s.conversations.find((x) => x.id === conversationId)
          if (c) {
            c.title = title
            c.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to update conversation title'
        })
        throw e
      }
    },

    generateConversationTitle: async (conversationId: string) => {
      try {
        const res = await window.knowlex.conversation.generateTitle(conversationId)
        if (!res?.success) throw new Error(res?.error || 'Failed to generate title')
        const title = res.data as string
        set((s) => {
          const c = s.conversations.find((x) => x.id === conversationId)
          if (c && title) {
            c.title = title
            c.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to generate conversation title'
        })
        throw e
      }
    },

    // Session settings
    updateSessionSettings: async (conversationId, settings) => {
      try {
        await window.knowlex.conversation.updateSettings(conversationId, settings)
        set((s) => {
          const c = s.conversations.find((x) => x.id === conversationId)
          if (c) {
            c.settings = { ...c.settings, ...settings }
            c.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to update session settings'
        })
        throw e
      }
    },

    // Messages
    sendMessage: async (content, files, options) => {
      if (content.length === 0 || !hasMeaningfulContent(content)) {
        const msg = 'Message must contain at least one meaningful content part'
        set((s) => {
          s.error = msg
        })
        throw new Error(msg)
      }
      set((s) => {
        s.isSending = true
        s.error = null
      })
      try {
        const res = await window.knowlex.message.send({
          ...(options?.conversationId ? { conversationId: options.conversationId } : {}),
          content,
          files
        })
        set((s) => {
          s.isSending = false
        })
        if (!res?.success || !res.data) throw new Error(res?.error || 'Failed to send message')
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : typeof e === 'string' ? e : 'Failed to send message'
        set((s) => {
          s.error = errorMessage
          s.isSending = false
        })
        throw new Error(errorMessage)
      }
    },

    regenerateMessage: async (messageId) => {
      try {
        await window.knowlex.message.regenerate(messageId)
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to regenerate message'
        })
        throw e
      }
    },

    editMessage: async (messageId, content) => {
      try {
        await window.knowlex.message.edit(messageId, content)
        set((s) => {
          const idx = s._msgIndex[messageId]
          if (!idx) return
          const msg = s.messages[idx.conversationId]?.[idx.idx]
          if (msg) {
            msg.content = content
            msg.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to edit message'
        })
        throw e
      }
    },

    deleteMessage: async (messageId) => {
      try {
        await window.knowlex.message.delete(messageId)
        set((s) => {
          const idx = s._msgIndex[messageId]
          if (!idx) return
          const arr = s.messages[idx.conversationId]
          if (!arr) return
          arr.splice(idx.idx, 1)
          delete s._msgIndex[messageId]
          // reindex following items
          for (let i = idx.idx; i < arr.length; i++) {
            const msg = arr[i]
            if (msg) {
              s._msgIndex[msg.id] = { conversationId: idx.conversationId, idx: i }
            }
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to delete message'
        })
        throw e
      }
    },

    // Loading
    loadMessages: async (conversationId) => {
      set((s) => {
        s.isLoadingMessages = true
        s.error = null
      })
      try {
        const res = await window.knowlex.message.list(conversationId)
        if (!res?.success) throw new Error(res?.error || 'Failed to load messages')
        const msgs = (res.data as Message[]) || []
        set((s) => {
          s.messages[conversationId] = msgs
          // rebuild index for this conversation
          msgs.forEach((m, i) => {
            s._msgIndex[m.id] = { conversationId, idx: i }
          })
          s.isLoadingMessages = false
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to load messages'
          s.isLoadingMessages = false
        })
      }
    },

    // Selection
    setCurrentConversation: (conversationId) => {
      const cur = get().currentConversationId
      if (cur === conversationId) return
      set((s) => {
        s.currentConversationId = conversationId
      })
      if (conversationId && !get().messages[conversationId] && !get().isLoadingMessages) {
        get().loadMessages(conversationId)
      }
    },

    getCurrentConversation: () => {
      const s = get()
      return s.conversations.find((c) => c.id === s.currentConversationId) || null
    },

    getCurrentMessages: () => {
      const s = get()
      return s.currentConversationId
        ? s.messages[s.currentConversationId] || EMPTY_MESSAGES
        : EMPTY_MESSAGES
    },

    // Streaming support
    onStreamingUpdate: (messageId, chunk) => {
      set((s) => {
        const idx = s._msgIndex[messageId]
        if (!idx) return
        const msg = s.messages[idx.conversationId]?.[idx.idx]
        if (!msg) return
        const last = msg.content[msg.content.length - 1]
        if (last?.type === 'text') last.text = (last.text || '') + chunk
        else msg.content.push({ type: 'text', text: chunk })
      })
    },

    setStreamingState: (isStreaming, messageId) => {
      set((s) => {
        s.isStreaming = isStreaming
        s.streamingMessageId = messageId || null
      })
    },

    stopStreaming: async (messageId) => {
      try {
        await window.knowlex.message.stop(messageId)
      } catch (e) {
        /* swallow to keep UI responsive */
      }
    },

    // Utilities
    clearError: () =>
      set((s) => {
        s.error = null
      }),

    reset: () =>
      set((s) => {
        Object.assign(s, initialState)
      }),

    initialize: async () => {
      set((s) => {
        s.isLoading = true
        s.error = null
      })
      try {
        const res = await window.knowlex.conversation.list()
        const convs = (res?.success && (res.data as Conversation[])) || []
        set((s) => {
          s.conversations = convs
          s.isLoading = false
        })
        setupEventListeners()
      } catch (e) {
        set((s) => {
          s.conversations = []
          s.isLoading = false
          s.error = e instanceof Error ? e.message : 'Failed to load conversations'
        })
      }
    }
  }))
)

// Hooks
export const useCurrentConversation = () => {
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const conversations = useConversationStore((s) => s.conversations)
  const messages = useConversationStore((s) => s.messages)
  const setCurrentConversation = useConversationStore((s) => s.setCurrentConversation)
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages)

  const currentConversation = React.useMemo(() => {
    if (!currentConversationId) return null
    const found = conversations.find((c) => c.id === currentConversationId)
    return (
      found ||
      ({
        id: currentConversationId,
        title: 'New Chat',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        settings: {} as any
      } as Conversation)
    )
  }, [currentConversationId, conversations])

  const currentMessages = React.useMemo(() => {
    return currentConversationId
      ? messages[currentConversationId] || EMPTY_MESSAGES
      : EMPTY_MESSAGES
  }, [currentConversationId, messages])

  return { currentConversation, currentMessages, setCurrentConversation, isLoadingMessages }
}

export const useConversations = () => useConversationStore((s) => s.conversations)
export const useConversationsLoading = () => useConversationStore((s) => s.isLoading)
export const useConversationsError = () => useConversationStore((s) => s.error)

export const useSendMessage = () => useConversationStore((s) => s.sendMessage)
export const useRegenerateMessage = () => useConversationStore((s) => s.regenerateMessage)
export const useEditMessage = () => useConversationStore((s) => s.editMessage)
export const useDeleteMessage = () => useConversationStore((s) => s.deleteMessage)
export const useIsSending = () => useConversationStore((s) => s.isSending)

export const useIsStreaming = () => useConversationStore((s) => s.isStreaming)
export const useStreamingMessageId = () => useConversationStore((s) => s.streamingMessageId)
export const useOnStreamingUpdate = () => useConversationStore((s) => s.onStreamingUpdate)
export const useSetStreamingState = () => useConversationStore((s) => s.setStreamingState)
export const useStopStreaming = () => useConversationStore((s) => s.stopStreaming)

export const useIsReasoningStreaming = () => useConversationStore((s) => s.isReasoningStreaming)
export const useReasoningStreamingMessageId = () =>
  useConversationStore((s) => s.reasoningStreamingMessageId)

export const useIsTextStreaming = () => useConversationStore((s) => s.isTextStreaming)
export const useTextStreamingMessageId = () => useConversationStore((s) => s.textStreamingMessageId)

export default useConversationStore

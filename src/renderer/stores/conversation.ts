/**
 * Conversation Store - Simplified Implementation
 * Manages conversations, messages, and model selection with cleaner logic
 */

import React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Conversation, SessionSettings } from '@shared/types/conversation'
import type { Message, MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'
import { getActiveModelId } from '@shared/utils/model-resolution'

const EMPTY_MESSAGES: Message[] = []
const nowISO = () => new Date().toISOString()

// ----------------------------------------
// Helper Functions
// ----------------------------------------

function sortByCreatedAtAsc(a: { createdAt?: string }, b: { createdAt?: string }) {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
  return ta - tb
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

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
// Store State & Interface
// ----------------------------------------

export interface ConversationState {
  // Core data
  conversations: Conversation[]
  messages: Record<string, Message[]>
  currentConversationId: string | null

  // Loading states
  isLoading: boolean
  isLoadingMessages: boolean
  isSending: boolean
  isLoadingMore: boolean
  hasMoreConversations: boolean

  // Streaming states
  isStreaming: boolean
  streamingMessageId: string | null
  isStartStreaming: boolean
  startStreamingMessageId: string | null
  isTextStreaming: boolean
  textStreamingMessageId: string | null
  isReasoningStreaming: boolean
  reasoningStreamingMessageId: string | null

  // Error state
  error: string | null

  // Message index for O(1) lookup
  _msgIndex: Record<string, { conversationId: string; idx: number }>

  // Actions
  initialize: () => Promise<void>
  reset: () => void
  clearError: () => void

  // Conversations
  createConversation: (title?: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>
  generateConversationTitle: (conversationId: string) => Promise<void>
  moveConversationToProject: (conversationId: string, projectId: string | null) => Promise<void>
  loadMoreConversations: () => Promise<void>

  // Navigation
  setCurrentConversation: (conversationId: string | null) => void
  getCurrentConversation: () => Conversation | null
  getCurrentMessages: () => Message[]

  // Models
  setActiveModel: (modelId: string) => Promise<void>
  getActiveModelId: (userDefaultModelId?: string) => string | null

  // Messages
  sendMessage: (
    content: MessageContent,
    options?: {
      conversationId?: string
      parentMessageId?: string
      projectId?: string
      reasoningEffort?: ReasoningEffort
      modelConfigId?: string
    }
  ) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  editMessage: (messageId: string, content: MessageContent) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  loadMessages: (conversationId: string) => Promise<void>

  // Session settings
  updateSessionSettings: (
    conversationId: string,
    settings: Partial<SessionSettings>
  ) => Promise<void>

  // Streaming
  onStreamingUpdate: (messageId: string, chunk: string) => void
  setStreamingState: (isStreaming: boolean, messageId?: string) => void
  stopStreaming: (messageId: string) => Promise<void>
}

// ----------------------------------------
// Initial State
// ----------------------------------------

const initialState = {
  conversations: [],
  messages: {},
  currentConversationId: null,
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  isLoadingMore: false,
  hasMoreConversations: true,
  isStreaming: false,
  streamingMessageId: null,
  isStartStreaming: false,
  startStreamingMessageId: null,
  isTextStreaming: false,
  textStreamingMessageId: null,
  isReasoningStreaming: false,
  reasoningStreamingMessageId: null,
  error: null,
  _msgIndex: {}
}

// ----------------------------------------
// Store Implementation
// ----------------------------------------

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => ({
    ...initialState,

    // ----------------------------------------
    // Utility Actions
    // ----------------------------------------

    reset: () => set(() => initialState),
    clearError: () =>
      set((s) => {
        s.error = null
      }),

    // ----------------------------------------
    // Model Management
    // ----------------------------------------

    setActiveModel: async (modelId: string) => {
      // Update current conversation if one exists
      const currentConversationId = get().currentConversationId
      if (currentConversationId) {
        try {
          const res = await window.knowlex.conversation.update({
            id: currentConversationId,
            modelConfigId: modelId
          })
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to update conversation model')
          }
          set((s) => {
            const conversation = s.conversations.find((c) => c.id === currentConversationId)
            if (conversation) {
              conversation.modelConfigId = modelId
              conversation.updatedAt = nowISO()
            }
          })
        } catch (e) {
          console.error('Failed to update conversation model:', e)
        }
      }
    },

    getActiveModelId: (userDefaultModelId?: string) => {
      const state = get()
      const currentConversation = state.conversations.find(
        (c) => c.id === state.currentConversationId
      )

      // Use centralized resolution logic
      return getActiveModelId({
        explicitModelId: null,
        conversationModelId: currentConversation?.modelConfigId || null,
        userDefaultModelId: userDefaultModelId || null
      })
    },

    // ----------------------------------------
    // Navigation
    // ----------------------------------------

    setCurrentConversation: (conversationId) => {
      set((s) => {
        s.currentConversationId = conversationId
      })

      // Load messages if needed
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

    // ----------------------------------------
    // Conversation Management
    // ----------------------------------------

    createConversation: async (title?: string) => {
      set((s) => {
        s.isLoading = true
        s.error = null
      })

      try {
        const res = await window.knowlex.conversation.create({ title: title || 'New Chat' })
        if (!res?.success || !res.data) {
          throw new Error(res?.error || 'Failed to create conversation')
        }

        const conv = res.data as Conversation
        set((s) => {
          if (!s.conversations.find((c) => c.id === conv.id)) {
            s.conversations.unshift(conv)
            s.messages[conv.id] = []
          }
          s.currentConversationId = conv.id
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
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to delete conversation')
        }

        set((s) => {
          // Clean up messages and index
          const msgs = s.messages[conversationId] || []
          msgs.forEach((m) => delete s._msgIndex[m.id])
          delete s.messages[conversationId]

          // Remove conversation
          s.conversations = s.conversations.filter((c) => c.id !== conversationId)

          // Reset current if deleted
          if (s.currentConversationId === conversationId) {
            s.currentConversationId = null
          }
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
          const conversation = s.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.title = title
            conversation.updatedAt = nowISO()
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
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to generate title')
        }

        const title = res.data as string
        set((s) => {
          const conversation = s.conversations.find((c) => c.id === conversationId)
          if (conversation && title) {
            conversation.title = title
            conversation.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to generate conversation title'
        })
        throw e
      }
    },

    moveConversationToProject: async (conversationId, projectId) => {
      try {
        const res = await window.knowlex.conversation.move(conversationId, projectId)
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to move conversation')
        }

        set((s) => {
          const conversation = s.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.projectId = projectId
            conversation.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to move conversation'
        })
        throw e
      }
    },

    loadMoreConversations: async () => {
      const currentState = get()
      if (!currentState.hasMoreConversations || currentState.isLoadingMore) return

      set((s) => {
        s.isLoadingMore = true
        s.error = null
      })

      try {
        const res = await window.knowlex.conversation.listPaginated({
          limit: 15,
          offset: currentState.conversations.length
        })

        if (!res?.success) {
          throw new Error(res?.error || 'Failed to load more conversations')
        }

        const { conversations: newConversations, hasMore } = res.data as {
          conversations: Conversation[]
          hasMore: boolean
        }

        set((s) => {
          s.conversations = dedupeById([...s.conversations, ...newConversations])
          s.hasMoreConversations = hasMore
          s.isLoadingMore = false
        })

        // Load messages for new conversations in background
        newConversations.forEach(async (conv) => {
          try {
            const messageRes = await window.knowlex.message.list(conv.id)
            if (messageRes?.success) {
              const msgs = (messageRes.data as Message[]) || []
              set((s) => {
                msgs.sort(sortByCreatedAtAsc)
                s.messages[conv.id] = msgs
                msgs.forEach((m, i) => {
                  s._msgIndex[m.id] = { conversationId: conv.id, idx: i }
                })
              })
            }
          } catch (e) {
            console.warn(`Failed to load messages for conversation ${conv.id}:`, e)
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to load more conversations'
          s.isLoadingMore = false
        })
      }
    },

    // ----------------------------------------
    // Session Settings
    // ----------------------------------------

    updateSessionSettings: async (conversationId, settings) => {
      try {
        await window.knowlex.conversation.updateSettings(conversationId, settings)
        set((s) => {
          const conversation = s.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.settings = { ...conversation.settings, ...settings }
            conversation.updatedAt = nowISO()
          }
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to update session settings'
        })
        throw e
      }
    },

    // ----------------------------------------
    // Message Management
    // ----------------------------------------

    sendMessage: async (content, options) => {
      if (!hasMeaningfulContent(content)) {
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
          ...(options?.conversationId && { conversationId: options.conversationId }),
          ...(options?.parentMessageId && { parentMessageId: options.parentMessageId }),
          ...(options?.projectId && { projectId: options.projectId }),
          ...(options?.reasoningEffort !== undefined && {
            reasoningEffort: options.reasoningEffort
          }),
          ...(options?.modelConfigId && { modelConfigId: options.modelConfigId }),
          content
        })

        if (!res?.success) {
          throw new Error(res?.error || 'Failed to send message')
        }

        set((s) => {
          s.isSending = false
        })
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to send message'
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
          if (idx) {
            const msg = s.messages[idx.conversationId]?.[idx.idx]
            if (msg) {
              msg.content = content
              msg.updatedAt = nowISO()
            }
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
          if (idx) {
            const arr = s.messages[idx.conversationId]
            if (arr) {
              arr.splice(idx.idx, 1)
              delete s._msgIndex[messageId]
              // Reindex remaining messages
              for (let i = idx.idx; i < arr.length; i++) {
                const msg = arr[i]
                if (msg) {
                  s._msgIndex[msg.id] = { conversationId: idx.conversationId, idx: i }
                }
              }
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

    loadMessages: async (conversationId) => {
      set((s) => {
        s.isLoadingMessages = true
        s.error = null
      })

      try {
        const res = await window.knowlex.message.list(conversationId)
        if (!res?.success) {
          throw new Error(res?.error || 'Failed to load messages')
        }

        const msgs = (res.data as Message[]) || []
        set((s) => {
          msgs.sort(sortByCreatedAtAsc)
          s.messages[conversationId] = msgs
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

    // ----------------------------------------
    // Streaming Management
    // ----------------------------------------

    onStreamingUpdate: (messageId, chunk) => {
      set((s) => {
        const idx = s._msgIndex[messageId]
        if (idx) {
          const msg = s.messages[idx.conversationId]?.[idx.idx]
          if (msg) {
            const last = msg.content[msg.content.length - 1]
            if (last?.type === 'text') {
              last.text = (last.text || '') + chunk
            } else {
              msg.content.push({ type: 'text', text: chunk })
            }
          }
        }
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
        set((s) => {
          if (s.streamingMessageId === messageId) {
            s.isStreaming = false
            s.streamingMessageId = null
          }
          if (s.reasoningStreamingMessageId === messageId) {
            s.isReasoningStreaming = false
            s.reasoningStreamingMessageId = null
          }
          if (s.startStreamingMessageId === messageId) {
            s.isStartStreaming = false
            s.startStreamingMessageId = null
          }
          if (s.textStreamingMessageId === messageId) {
            s.isTextStreaming = false
            s.textStreamingMessageId = null
          }
        })
      } catch (e) {
        console.error('Failed to stop streaming:', e)
      }
    },

    // ----------------------------------------
    // Initialization
    // ----------------------------------------

    initialize: async () => {
      set((s) => {
        s.isLoading = true
        s.error = null
      })

      try {
        const res = await window.knowlex.conversation.listPaginated({
          limit: 15,
          offset: 0
        })

        if (!res?.success) {
          throw new Error(res?.error || 'Failed to load conversations')
        }

        const { conversations: recentConversations, hasMore } = res.data as {
          conversations: Conversation[]
          hasMore: boolean
        }

        set((s) => {
          s.conversations = dedupeById(recentConversations)
          s.hasMoreConversations = hasMore
          s.isLoading = false
        })

        // Load messages for recent conversations in background
        recentConversations.forEach(async (conv) => {
          try {
            const messageRes = await window.knowlex.message.list(conv.id)
            if (messageRes?.success) {
              const msgs = (messageRes.data as Message[]) || []
              set((s) => {
                msgs.sort(sortByCreatedAtAsc)
                s.messages[conv.id] = msgs
                msgs.forEach((m, i) => {
                  s._msgIndex[m.id] = { conversationId: conv.id, idx: i }
                })
              })
            }
          } catch (e) {
            console.warn(`Failed to preload messages for conversation ${conv.id}:`, e)
          }
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

// ----------------------------------------
// Event Listeners
// ----------------------------------------

let eventListenersSetup = false

function setupEventListeners() {
  if (eventListenersSetup) return
  eventListenersSetup = true

  const on = window.knowlex?.events?.on
  if (!on) return

  const setState = useConversationStore.setState

  // Batch ultra-frequent streaming chunks to avoid deep nested updates
  let pendingTextChunks: Record<string, string> = {}
  let pendingReasoningChunks: Record<string, string> = {}
  let flushTextChunksHandle: number | null = null
  let flushReasoningChunksHandle: number | null = null
  const requestFrame: (cb: FrameRequestCallback) => number =
    (window as any).requestAnimationFrame ||
    ((cb: FrameRequestCallback) => setTimeout(cb, 16) as any)

  function flushTextChunks() {
    const chunks = pendingTextChunks
    pendingTextChunks = {}
    flushTextChunksHandle = null
    const messageIds = Object.keys(chunks)
    if (messageIds.length === 0) return

    setState((s) => {
      for (const messageId of messageIds) {
        const combined = chunks[messageId]
        if (!combined) continue
        const idx = s._msgIndex[messageId]
        if (!idx) continue
        const msg = s.messages[idx.conversationId]?.[idx.idx]
        if (!msg) continue
        const last = msg.content[msg.content.length - 1]
        if (last?.type === 'text') {
          last.text = (last.text === '\u200B' ? '' : last.text || '') + combined
        } else {
          msg.content.push({ type: 'text', text: combined })
        }
        msg.updatedAt = nowISO()
      }
    })
  }

  function enqueueTextChunk(messageId: string, chunk: string) {
    pendingTextChunks[messageId] = (pendingTextChunks[messageId] || '') + chunk
    if (flushTextChunksHandle == null) {
      flushTextChunksHandle = requestFrame(() => flushTextChunks())
    }
  }

  function flushReasoningChunks() {
    const chunks = pendingReasoningChunks
    pendingReasoningChunks = {}
    flushReasoningChunksHandle = null
    const messageIds = Object.keys(chunks)
    if (messageIds.length === 0) return

    setState((s) => {
      for (const messageId of messageIds) {
        const combined = chunks[messageId]
        if (!combined) continue
        const idx = s._msgIndex[messageId]
        if (!idx) continue
        const msg = s.messages[idx.conversationId]?.[idx.idx]
        if (!msg) continue
        msg.reasoning = (msg.reasoning || '') + combined
        msg.updatedAt = nowISO()
      }
    })
  }

  function enqueueReasoningChunk(messageId: string, chunk: string) {
    pendingReasoningChunks[messageId] = (pendingReasoningChunks[messageId] || '') + chunk
    if (flushReasoningChunksHandle == null) {
      flushReasoningChunksHandle = requestFrame(() => flushReasoningChunks())
    }
  }

  // Conversation events
  on('conversation:created', (_, data: any) => {
    if (!data?.id) return
    setState((s) => {
      if (!s.conversations.find((c) => c.id === data.id)) {
        s.conversations.unshift(data)
        s.messages[data.id] = []
      }
    })
  })

  on('conversation:title_generated', (_, data: any) => {
    if (!data?.conversationId || !data?.title) return
    setState((s) => {
      const conversation = s.conversations.find((c) => c.id === data.conversationId)
      if (conversation) {
        conversation.title = data.title
        conversation.updatedAt = nowISO()
      }
    })
  })

  // Message events
  on('message:added', (_, data: any) => {
    if (!data?.id || !data?.conversationId) return
    setState((s) => {
      const list = s.messages[data.conversationId] || []
      if (!list.some((m) => m.id === data.id)) {
        s._msgIndex[data.id] = { conversationId: data.conversationId, idx: list.length }
        list.push(data as Message)
        list.sort(sortByCreatedAtAsc)
        s.messages[data.conversationId] = list

        // Rebuild index after sort
        list.forEach((m, i) => {
          s._msgIndex[m.id] = { conversationId: data.conversationId, idx: i }
        })
      }

      if (!s.currentConversationId) {
        s.currentConversationId = data.conversationId
      }
    })
  })

  on('message:updated', (_, data: any) => {
    if (!data?.id || !data?.conversationId) return
    setState((s) => {
      const idx = s._msgIndex[data.id]
      if (idx) {
        const arr = s.messages[idx.conversationId]
        if (arr) {
          arr[idx.idx] = data as Message
        }
      }
    })
  })

  // Streaming events
  on('message:streaming_start', (_, data: any) => {
    if (!data?.messageId || !data?.message) return
    setState((s) => {
      s.isStreaming = true
      s.streamingMessageId = data.messageId

      const cid = data.message.conversationId
      const arr = s.messages[cid] || []

      if (!s.currentConversationId) {
        s.currentConversationId = cid
      }

      const idx = arr.findIndex((m) => m.id === data.messageId)
      if (idx === -1) {
        s._msgIndex[data.messageId] = { conversationId: cid, idx: arr.length }
        arr.push(data.message)
        s.messages[cid] = arr
      } else {
        arr[idx] = data.message
        s._msgIndex[data.messageId] = { conversationId: cid, idx }
      }
    })
  })

  on('message:streaming_chunk', (_, data: any) => {
    if (!data?.messageId || !data?.chunk) return
    // Defer/batch updates to prevent nested update depth warnings
    enqueueTextChunk(data.messageId, data.chunk)
  })

  on('message:streaming_end', (_, data: any) => {
    if (!data?.messageId || !data?.message) return
    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null

      const idx = s._msgIndex[data.messageId]
      if (idx) {
        const arr = s.messages[idx.conversationId]
        if (arr) {
          const current = arr[idx.idx]
          const finalMsg = data.message as Message
          if (current?.reasoning && !finalMsg.reasoning) {
            finalMsg.reasoning = current.reasoning
          }
          arr[idx.idx] = finalMsg
        }
      }
    })
  })

  on('message:streaming_error', (_, data: any) => {
    if (!data?.messageId || !data?.message) return
    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null

      const idx = s._msgIndex[data.messageId]
      if (idx) {
        const arr = s.messages[idx.conversationId]
        if (arr) {
          arr[idx.idx] = data.message
        }
      }

      s.error = data.error || 'Streaming failed'
    })
  })

  on('message:streaming_cancelled', (_, data: any) => {
    if (!data?.messageId) return
    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null
      s.isStartStreaming = false
      s.startStreamingMessageId = null
      s.isReasoningStreaming = false
      s.reasoningStreamingMessageId = null
      s.isTextStreaming = false
      s.textStreamingMessageId = null

      if (data.message) {
        const idx = s._msgIndex[data.messageId]
        if (idx) {
          const arr = s.messages[idx.conversationId]
          if (arr) {
            const current = arr[idx.idx]
            const partial = data.message as Message
            if (current?.reasoning && !partial.reasoning) {
              partial.reasoning = current.reasoning
            }
            arr[idx.idx] = partial
          }
        }
      }
    })
  })

  // Reasoning streaming events
  on('message:reasoning_start', (_, data: any) => {
    if (!data?.messageId) return
    setState((s) => {
      s.isReasoningStreaming = true
      s.reasoningStreamingMessageId = data.messageId

      const idx = s._msgIndex[data.messageId]
      if (idx) {
        const msg = s.messages[idx.conversationId]?.[idx.idx]
        if (msg && !msg.reasoning) {
          msg.reasoning = ''
        }
      }
    })
  })

  on('message:reasoning_chunk', (_, data: any) => {
    if (!data?.messageId || !data?.chunk) return
    // Batch reasoning updates similar to text to avoid deep updates
    enqueueReasoningChunk(data.messageId, data.chunk)
  })

  on('message:reasoning_end', (_, data: any) => {
    if (!data?.messageId) return
    setState((s) => {
      s.isReasoningStreaming = false
      s.reasoningStreamingMessageId = null

      const idx = s._msgIndex[data.messageId]
      if (idx) {
        const msg = s.messages[idx.conversationId]?.[idx.idx]
        if (msg) {
          msg.updatedAt = nowISO()
        }
      }
    })
  })

  // Start streaming event
  on('message:start', (_, data: any) => {
    if (!data?.messageId) return
    setState((s) => {
      s.isStartStreaming = true
      s.startStreamingMessageId = data.messageId
    })
  })

  // Text streaming events
  on('message:text_start', (_, data: any) => {
    if (!data?.messageId) return
    setState((s) => {
      s.isTextStreaming = true
      s.textStreamingMessageId = data.messageId
    })
  })

  on('message:text_end', (_, data: any) => {
    if (!data?.messageId) return
    setState((s) => {
      s.isTextStreaming = false
      s.textStreamingMessageId = null
      // Also stop start streaming when text ends
      if (s.startStreamingMessageId === data.messageId) {
        s.isStartStreaming = false
        s.startStreamingMessageId = null
      }
    })
  })
}

// ----------------------------------------
// Hooks
// ----------------------------------------

export const useCurrentConversation = () => {
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const conversations = useConversationStore((s) => s.conversations)
  const messages = useConversationStore((s) => s.messages)
  const setCurrentConversation = useConversationStore((s) => s.setCurrentConversation)
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages)

  const currentConversation = React.useMemo(() => {
    if (!currentConversationId) return null
    return conversations.find((c) => c.id === currentConversationId) || null
  }, [currentConversationId, conversations])

  const currentMessages = React.useMemo(() => {
    return currentConversationId
      ? messages[currentConversationId] || EMPTY_MESSAGES
      : EMPTY_MESSAGES
  }, [currentConversationId, messages])

  return { currentConversation, currentMessages, setCurrentConversation, isLoadingMessages }
}

// Export individual hooks
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
export const useIsStartStreaming = () => useConversationStore((s) => s.isStartStreaming)
export const useStartStreamingMessageId = () =>
  useConversationStore((s) => s.startStreamingMessageId)
export const useIsTextStreaming = () => useConversationStore((s) => s.isTextStreaming)
export const useTextStreamingMessageId = () => useConversationStore((s) => s.textStreamingMessageId)

export default useConversationStore

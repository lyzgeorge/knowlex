/**
 * Conversation Store - Refactored Implementation
 * Simplified, atomic, and more maintainable conversation management
 */

import React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Conversation } from '@shared/types/conversation'
import type { Message } from '@shared/types/message'
import { getActiveModelId } from '@shared/utils/model-resolution'

// Import utilities
import { conversationApi, messageApi } from './conversation/api'
import { CONVERSATION_CONSTANTS } from './conversation/constants'
import { runAsync, loadingSetters } from './conversation/async-utils'
import { ingestMessages, removeMessage, updateMessage } from './conversation/message-index'
import { registerAllEvents, type EventCleanupFunction } from './conversation/events'
import {
  dedupeById,
  hasMeaningfulContent,
  updateConversation,
  EMPTY_MESSAGES
} from './conversation/utils'
import type { ConversationState } from './conversation/types'

// ----------------------------------------
// Initial State
// ----------------------------------------

const createInitialState = () => ({
  // Core data
  conversations: [],
  messages: {},
  messageIndex: {},
  currentConversationId: null,

  // Loading states
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  isLoadingMore: false,
  hasMoreConversations: true,

  // Streaming states
  isStreaming: false,
  streamingMessageId: null,
  isStartStreaming: false,
  startStreamingMessageId: null,
  isTextStreaming: false,
  textStreamingMessageId: null,
  isReasoningStreaming: false,
  reasoningStreamingMessageId: null,

  // Error state
  error: null
})

// ----------------------------------------
// Store Implementation
// ----------------------------------------

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => {
    let eventCleanup: EventCleanupFunction | null = null

    const store: ConversationState = {
      ...createInitialState(),

      // ----------------------------------------
      // Utility Actions
      // ----------------------------------------

      reset: () => {
        if (eventCleanup) {
          eventCleanup()
          eventCleanup = null
        }
        set(() => createInitialState() as any)
      },

      clearError: () =>
        set((s) => {
          s.error = null
        }),

      cleanup: () => {
        if (eventCleanup) {
          eventCleanup()
          eventCleanup = null
        }
      },

      // ----------------------------------------
      // Model Management
      // ----------------------------------------

      setActiveModel: async (modelId: string) => {
        const currentConversationId = get().currentConversationId
        if (!currentConversationId) return

        return runAsync(set, async () => {
          const res = await conversationApi.update({
            id: currentConversationId,
            modelConfigId: modelId
          })
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to update conversation model')
          }

          set((s) => {
            updateConversation(s.conversations, currentConversationId, (conversation) => {
              conversation.modelConfigId = modelId
            })
          })
        })
      },

      getActiveModelId: (userDefaultModelId?: string) => {
        const state = get()
        const currentConversation = state.conversations.find(
          (c) => c.id === state.currentConversationId
        )

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
        return runAsync(
          set,
          async () => {
            const res = await conversationApi.create({
              title: title || CONVERSATION_CONSTANTS.DEFAULT_CONVERSATION_TITLE
            })
            if (!res?.success || !res.data) {
              throw new Error(res?.error || 'Failed to create conversation')
            }

            const conv = res.data
            set((s) => {
              if (!s.conversations.find((c) => c.id === conv.id)) {
                s.conversations.unshift(conv)
                s.messages[conv.id] = []
              }
              s.currentConversationId = conv.id
            })

            return conv
          },
          { setLoading: loadingSetters.isLoading }
        )
      },

      deleteConversation: async (conversationId: string) => {
        return runAsync(set, async () => {
          const res = await conversationApi.delete(conversationId)
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to delete conversation')
          }

          set((s) => {
            // Clean up messages and index
            const msgs = s.messages[conversationId] || []
            msgs.forEach((m) => delete s.messageIndex[m.id])
            delete s.messages[conversationId]

            // Remove conversation
            s.conversations = s.conversations.filter((c) => c.id !== conversationId)

            // Reset current if deleted
            if (s.currentConversationId === conversationId) {
              s.currentConversationId = null
            }
          })
        })
      },

      updateConversationTitle: async (conversationId: string, title: string) => {
        return runAsync(set, async () => {
          const res = await conversationApi.updateTitle(conversationId, title)
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to update conversation title')
          }

          set((s) => {
            updateConversation(s.conversations, conversationId, (conversation) => {
              conversation.title = title
            })
          })
        })
      },

      generateConversationTitle: async (conversationId: string) => {
        return runAsync(set, async () => {
          const res = await conversationApi.generateTitle(conversationId)
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to generate title')
          }

          const title = res.data as string
          if (title) {
            set((s) => {
              updateConversation(s.conversations, conversationId, (conversation) => {
                conversation.title = title
              })
            })
          }
        })
      },

      moveConversationToProject: async (conversationId, projectId) => {
        return runAsync(set, async () => {
          const res = await conversationApi.move(conversationId, projectId)
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to move conversation')
          }

          set((s) => {
            updateConversation(s.conversations, conversationId, (conversation) => {
              conversation.projectId = projectId
            })
          })
        })
      },

      loadMoreConversations: async () => {
        const currentState = get()
        if (!currentState.hasMoreConversations || currentState.isLoadingMore) return

        return runAsync(
          set,
          async () => {
            const res = await conversationApi.listPaginated({
              limit: CONVERSATION_CONSTANTS.CONVERSATIONS_PAGE_SIZE,
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
            })

            // Load messages for new conversations in background
            await Promise.allSettled(
              newConversations.map(async (conv) => {
                try {
                  const messageRes = await messageApi.list(conv.id)
                  if (messageRes?.success) {
                    const msgs = (messageRes.data as Message[]) || []
                    set((s) => {
                      ingestMessages(s, conv.id, msgs, { replace: true })
                      const c = s.conversations.find((cc) => cc.id === conv.id)
                      if (c && msgs.length) {
                        const last = msgs[msgs.length - 1]
                        if (last) c.updatedAt = last.updatedAt || last.createdAt || c.updatedAt
                      }
                    })
                  }
                } catch (e) {
                  console.warn(`Failed to load messages for conversation ${conv.id}:`, e)
                }
              })
            )
          },
          { setLoading: loadingSetters.isLoadingMore }
        )
      },

      // ----------------------------------------
      // Session Settings
      // ----------------------------------------

      updateSessionSettings: async (conversationId, settings) => {
        return runAsync(set, async () => {
          const res = await conversationApi.updateSettings(conversationId, settings)
          if (!res?.success) {
            throw new Error(res?.error || 'Failed to update session settings')
          }

          set((s) => {
            updateConversation(s.conversations, conversationId, (conversation) => {
              conversation.settings = { ...conversation.settings, ...settings }
            })
          })
        })
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

        return runAsync(
          set,
          async () => {
            const res = await messageApi.send({
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
          },
          { setLoading: loadingSetters.isSending }
        )
      },

      regenerateMessage: async (messageId) => {
        return runAsync(set, async () => {
          await messageApi.regenerate(messageId)
        })
      },

      editMessage: async (messageId, content) => {
        return runAsync(set, async () => {
          await messageApi.edit(messageId, content)
          set((s) => {
            updateMessage(s, messageId, (message) => {
              message.content = content
            })

            // Update parent conversation's updatedAt
            const idx = s.messageIndex[messageId]
            if (idx) {
              const conv = s.conversations.find((c) => c.id === idx.conversationId)
              const msg = s.messages[idx.conversationId]?.[idx.idx]
              if (conv) conv.updatedAt = msg?.updatedAt || new Date().toISOString()
            }
          })
        })
      },

      deleteMessage: async (messageId) => {
        return runAsync(set, async () => {
          await messageApi.delete(messageId)
          set((s) => {
            // Capture conversation id before removal
            const idx = s.messageIndex[messageId]
            const convId = idx?.conversationId
            removeMessage(s, messageId)

            // Update conversation updatedAt to last message or keep existing
            if (convId) {
              const msgs = s.messages[convId] || []
              const last = msgs.length ? msgs[msgs.length - 1] : null
              const conv = s.conversations.find((c) => c.id === convId)
              if (conv)
                conv.updatedAt = last
                  ? last.updatedAt || last.createdAt || conv.updatedAt
                  : conv.updatedAt
            }
          })
        })
      },

      loadMessages: async (conversationId) => {
        return runAsync(
          set,
          async () => {
            const res = await messageApi.list(conversationId)
            if (!res?.success) {
              throw new Error(res?.error || 'Failed to load messages')
            }

            const msgs = (res.data as Message[]) || []
            set((s) => {
              ingestMessages(s, conversationId, msgs, { replace: true })
              // Update conversation updatedAt based on messages
              const conv = s.conversations.find((c) => c.id === conversationId)
              if (conv && msgs.length) {
                const last = msgs[msgs.length - 1]
                if (last) conv.updatedAt = last.updatedAt || last.createdAt || conv.updatedAt
              }
            })
          },
          { setLoading: loadingSetters.isLoadingMessages }
        )
      },

      // ----------------------------------------
      // Streaming Management
      // ----------------------------------------

      onStreamingUpdate: (messageId, chunk) => {
        set((s) => {
          updateMessage(s, messageId, (message) => {
            const last = message.content[message.content.length - 1]
            if (last?.type === 'text') {
              last.text = (last.text || '') + chunk
            } else {
              message.content.push({ type: 'text', text: chunk })
            }
          })
          // Update parent conversation's updatedAt
          const idx = s.messageIndex[messageId]
          if (idx) {
            const conv = s.conversations.find((c) => c.id === idx.conversationId)
            if (conv) conv.updatedAt = new Date().toISOString()
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
          await messageApi.stop(messageId)
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
        return runAsync(
          set,
          async () => {
            const res = await conversationApi.listPaginated({
              limit: CONVERSATION_CONSTANTS.CONVERSATIONS_PAGE_SIZE,
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
            })

            // Load messages for recent conversations in background
            await Promise.allSettled(
              recentConversations.map(async (conv) => {
                try {
                  const messageRes = await messageApi.list(conv.id)
                  if (messageRes?.success) {
                    const msgs = (messageRes.data as Message[]) || []
                    set((s) => {
                      ingestMessages(s, conv.id, msgs, { replace: true })
                      const c = s.conversations.find((cc) => cc.id === conv.id)
                      if (c && msgs.length) {
                        const last = msgs[msgs.length - 1]
                        if (last) c.updatedAt = last.updatedAt || last.createdAt || c.updatedAt
                      }
                    })
                  }
                } catch (e) {
                  console.warn(`Failed to preload messages for conversation ${conv.id}:`, e)
                }
              })
            )

            // Setup event listeners
            if (!eventCleanup) {
              eventCleanup = registerAllEvents(set)
            }
          },
          { setLoading: loadingSetters.isLoading }
        )
      }
    }

    return store
  })
)

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

/**
 * Conversation Store (final consolidated implementation)
 * Migrated from legacy `src/renderer/stores/conversation.ts`.
 * Depends only on co-located consolidated modules (data, utils, streaming, events, types, hooks).
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Conversation } from '@shared/types/conversation-types'
import type { Message } from '@shared/types/message'
import { getActiveModelId } from '@shared/utils/model-resolution'
// unwrap/assert are replaced by runAsync autoUnwrap behavior

// Local consolidated modules
import {
  conversationApi,
  messageApi,
  ingestMessages,
  removeMessage,
  updateMessage,
  preloadAndIndexMessagesFor
} from './data'
import {
  CONVERSATION_CONSTANTS,
  updateConversation,
  clearStreamingFlagsForMessage,
  dedupeById,
  hasMeaningfulContent,
  EMPTY_MESSAGES,
  updateConversationTimestampByMessageId
} from './utils'
import { runAsync, runApiCall, loadingSetters } from '@renderer/utils/store-helpers'
import { applyTextChunkToDraft } from './streaming'
import { registerAllEvents, type EventCleanupFunction } from './events'
import type { ConversationState } from './types'

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

      // Utility Actions
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

      // Model Management
      setActiveModel: async (modelId: string) => {
        const currentConversationId = get().currentConversationId
        if (!currentConversationId) return

        return runApiCall(
          set,
          () => conversationApi.update({ id: currentConversationId, modelConfigId: modelId }),
          'Failed to update conversation model',
          () => {
            set((s) => {
              updateConversation(s.conversations, currentConversationId, (conversation) => {
                conversation.modelConfigId = modelId
              })
            })
          },
          { autoUnwrap: true, action: 'update conversation model' }
        )
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

      // Navigation
      setCurrentConversation: (conversationId) => {
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

      // Conversation Management
      createConversation: async (title?: string) => {
        return runAsync(
          set,
          async () => {
            const res = await conversationApi.create({
              title: title || CONVERSATION_CONSTANTS.DEFAULT_CONVERSATION_TITLE
            })
            const conv = (res as any).data
            set((s) => {
              if (!s.conversations.find((c) => c.id === conv.id)) {
                s.conversations.unshift(conv)
                s.messages[conv.id] = []
              }
              s.currentConversationId = conv.id
            })

            return conv
          },
          { setLoading: loadingSetters.isLoading, autoUnwrap: true, action: 'create conversation' }
        )
      },
      deleteConversation: async (conversationId: string) => {
        return runApiCall(
          set,
          () => conversationApi.delete(conversationId),
          'Failed to delete conversation',
          () => {
            set((s) => {
              const msgs = s.messages[conversationId] || []
              msgs.forEach((m) => delete s.messageIndex[m.id])
              delete s.messages[conversationId]

              s.conversations = s.conversations.filter((c) => c.id !== conversationId)
              if (s.currentConversationId === conversationId) {
                s.currentConversationId = null
              }
            })
          },
          { autoUnwrap: true, action: 'delete conversation' }
        )
      },
      updateConversationTitle: async (conversationId: string, title: string) => {
        return runApiCall(
          set,
          () => conversationApi.updateTitle(conversationId, title),
          'Failed to update conversation title',
          () => {
            set((s) => {
              updateConversation(s.conversations, conversationId, (conversation) => {
                conversation.title = title
              })
            })
          },
          { autoUnwrap: true, action: 'update conversation title' }
        )
      },
      // Manual title generation removed; auto-generation happens after first exchange.
      moveConversationToProject: async (conversationId, projectId) => {
        return runApiCall(
          set,
          () => conversationApi.move(conversationId, projectId),
          'Failed to move conversation',
          () => {
            set((s) => {
              updateConversation(s.conversations, conversationId, (conversation) => {
                conversation.projectId = projectId
              })
            })
          },
          { autoUnwrap: true, action: 'move conversation' }
        )
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
            const { conversations: newConversations, hasMore } = (res as any).data as {
              conversations: Conversation[]
              hasMore: boolean
            }

            set((s) => {
              s.conversations = dedupeById([...s.conversations, ...newConversations])
              s.hasMoreConversations = hasMore
            })

            await preloadAndIndexMessagesFor(newConversations, (apply) => apply(set))
          },
          {
            setLoading: loadingSetters.isLoadingMore,
            autoUnwrap: true,
            action: 'load more conversations'
          }
        )
      },

      // Session Settings
      updateSessionSettings: async (conversationId, settings) => {
        return runApiCall(
          set,
          () => conversationApi.updateSettings(conversationId, settings),
          'Failed to update session settings',
          () => {
            set((s) => {
              updateConversation(s.conversations, conversationId, (conversation) => {
                conversation.settings = { ...conversation.settings, ...settings }
              })
            })
          },
          { autoUnwrap: true, action: 'update session settings' }
        )
      },

      // Message Management
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
            if (!res?.success) throw new Error((res as any).error || 'Failed to send message')
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
            updateConversationTimestampByMessageId(s, messageId)
          })
        })
      },
      deleteMessage: async (messageId) => {
        return runAsync(set, async () => {
          await messageApi.delete(messageId)
          set((s) => {
            const idx = s.messageIndex[messageId]
            const convId = idx?.conversationId
            removeMessage(s, messageId)
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
            const msgs = ((res as any).data as Message[]) || []
            set((s) => {
              ingestMessages(s, conversationId, msgs, { replace: true })
              const conv = s.conversations.find((c) => c.id === conversationId)
              if (conv && msgs.length) {
                const last = msgs[msgs.length - 1]
                if (last) conv.updatedAt = last.updatedAt || last.createdAt || conv.updatedAt
              }
            })
          },
          {
            setLoading: loadingSetters.isLoadingMessages,
            autoUnwrap: true,
            action: 'load messages'
          }
        )
      },

      // Streaming Management
      onStreamingUpdate: (messageId, chunk) => {
        set((s) => {
          updateMessage(s, messageId, (message) => {
            applyTextChunkToDraft(message, chunk)
          })
          updateConversationTimestampByMessageId(s, messageId)
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
            clearStreamingFlagsForMessage(s, messageId)
          })
        } catch (e) {
          console.error('Failed to stop streaming:', e)
        }
      },

      // Initialization
      initialize: async () => {
        return runAsync(
          set,
          async () => {
            const res = await conversationApi.listPaginated({
              limit: CONVERSATION_CONSTANTS.CONVERSATIONS_PAGE_SIZE,
              offset: 0
            })
            const { conversations: recentConversations, hasMore } = (res as any).data as {
              conversations: Conversation[]
              hasMore: boolean
            }
            set((s) => {
              s.conversations = dedupeById(recentConversations)
              s.hasMoreConversations = hasMore
            })
            await preloadAndIndexMessagesFor(recentConversations, (apply) => apply(set))
            if (!eventCleanup) {
              eventCleanup = registerAllEvents(set)
            }
          },
          { setLoading: loadingSetters.isLoading, autoUnwrap: true, action: 'load conversations' }
        )
      }
    }
    return store
  })
)

export default useConversationStore

/**
 * Conversation state store for Knowlex Desktop Application
 * Manages conversations, messages, and chat functionality
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Conversation, SessionSettings } from '../../../shared/types/conversation'
import type { Message, MessageContent } from '../../../shared/types/message'
import { generateMockConversations } from '../utils/mockData'

export interface ConversationState {
  // Data state
  conversations: Conversation[]
  messages: Record<string, Message[]> // conversationId -> messages
  currentConversationId: string | null

  // Streaming state
  isStreaming: boolean
  streamingMessageId: string | null

  // Loading states
  isLoading: boolean
  isLoadingMessages: boolean
  isSending: boolean

  // Error state
  error: string | null

  // Conversation operations
  createConversation: (projectId?: string, title?: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  moveConversation: (conversationId: string, projectId: string | null) => Promise<void>
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>
  generateConversationTitle: (conversationId: string) => Promise<void>

  // Session settings
  updateSessionSettings: (
    conversationId: string,
    settings: Partial<SessionSettings>
  ) => Promise<void>

  // Message operations
  sendMessage: (conversationId: string, content: MessageContent, files?: File[]) => Promise<void>
  regenerateMessage: (messageId: string) => Promise<void>
  editMessage: (messageId: string, content: MessageContent) => Promise<void>
  deleteMessage: (messageId: string) => Promise<void>
  forkConversation: (messageId: string) => Promise<Conversation>

  // Message loading
  loadMessages: (conversationId: string) => Promise<void>

  // Selection and navigation
  setCurrentConversation: (conversationId: string | null) => void
  getCurrentConversation: () => Conversation | null
  getCurrentMessages: () => Message[]

  // Streaming support
  onStreamingUpdate: (messageId: string, chunk: string) => void
  setStreamingState: (isStreaming: boolean, messageId?: string) => void

  // Utilities
  clearError: () => void
  reset: () => void
}

export interface SendMessageData {
  content: MessageContent
  files?: File[]
  parentMessageId?: string
}

const initialState = {
  conversations: generateMockConversations(),
  messages: {},
  currentConversationId: null,
  isStreaming: false,
  streamingMessageId: null,
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  error: null
}

export const useConversationStore = create<ConversationState>()(
  immer((set, get) => ({
    ...initialState,

    // Conversation Operations
    createConversation: async (projectId?: string, title?: string) => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        const conversation = await window.electronAPI?.invoke('conversation:create', {
          projectId,
          title: title || 'New Chat'
        })

        set((state) => {
          state.conversations.push(conversation)
          state.currentConversationId = conversation.id
          state.messages[conversation.id] = []
          state.isLoading = false
        })

        return conversation
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create conversation'
          state.isLoading = false
        })
        throw error
      }
    },

    deleteConversation: async (conversationId: string) => {
      try {
        await window.electronAPI?.invoke('conversation:delete', conversationId)

        set((state) => {
          state.conversations = state.conversations.filter((c) => c.id !== conversationId)
          delete state.messages[conversationId]
          if (state.currentConversationId === conversationId) {
            state.currentConversationId = null
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete conversation'
        })
        throw error
      }
    },

    moveConversation: async (conversationId: string, projectId: string | null) => {
      try {
        await window.electronAPI?.invoke('conversation:move', conversationId, projectId)

        set((state) => {
          const conversation = state.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.projectId = projectId
            conversation.updatedAt = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to move conversation'
        })
        throw error
      }
    },

    updateConversationTitle: async (conversationId: string, title: string) => {
      try {
        await window.electronAPI?.invoke('conversation:update-title', conversationId, title)

        set((state) => {
          const conversation = state.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.title = title
            conversation.updatedAt = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error =
            error instanceof Error ? error.message : 'Failed to update conversation title'
        })
        throw error
      }
    },

    generateConversationTitle: async (conversationId: string) => {
      try {
        const title = await window.electronAPI?.invoke(
          'conversation:generate-title',
          conversationId
        )

        set((state) => {
          const conversation = state.conversations.find((c) => c.id === conversationId)
          if (conversation && title) {
            conversation.title = title
            conversation.updatedAt = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error =
            error instanceof Error ? error.message : 'Failed to generate conversation title'
        })
        throw error
      }
    },

    // Session Settings
    updateSessionSettings: async (conversationId: string, settings: Partial<SessionSettings>) => {
      try {
        await window.electronAPI?.invoke('conversation:update-settings', conversationId, settings)

        set((state) => {
          const conversation = state.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.settings = { ...conversation.settings, ...settings }
            conversation.updatedAt = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to update session settings'
        })
        throw error
      }
    },

    // Message Operations
    sendMessage: async (conversationId: string, content: MessageContent, files?: File[]) => {
      set((state) => {
        state.isSending = true
        state.error = null
      })

      try {
        // Optimistically add user message
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          conversationId,
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set((state) => {
          if (!state.messages[conversationId]) {
            state.messages[conversationId] = []
          }
          state.messages[conversationId].push(userMessage)
        })

        // Send message and handle streaming response
        await window.electronAPI?.invoke('message:send', {
          conversationId,
          content,
          files
        })

        set((state) => {
          state.isSending = false
        })

        // Update conversation timestamp
        set((state) => {
          const conversation = state.conversations.find((c) => c.id === conversationId)
          if (conversation) {
            conversation.updatedAt = new Date().toISOString()
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to send message'
          state.isSending = false
        })
        throw error
      }
    },

    regenerateMessage: async (messageId: string) => {
      try {
        await window.electronAPI?.invoke('message:regenerate', messageId)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to regenerate message'
        })
        throw error
      }
    },

    editMessage: async (messageId: string, content: MessageContent) => {
      try {
        await window.electronAPI?.invoke('message:edit', messageId, content)

        // Update message in local state
        set((state) => {
          for (const conversationMessages of Object.values(state.messages)) {
            const messageIndex = conversationMessages.findIndex((m) => m.id === messageId)
            if (messageIndex !== -1) {
              conversationMessages[messageIndex].content = content
              conversationMessages[messageIndex].updatedAt = new Date().toISOString()
              break
            }
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to edit message'
        })
        throw error
      }
    },

    deleteMessage: async (messageId: string) => {
      try {
        await window.electronAPI?.invoke('message:delete', messageId)

        // Remove message from local state
        set((state) => {
          for (const conversationMessages of Object.values(state.messages)) {
            const messageIndex = conversationMessages.findIndex((m) => m.id === messageId)
            if (messageIndex !== -1) {
              conversationMessages.splice(messageIndex, 1)
              break
            }
          }
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete message'
        })
        throw error
      }
    },

    forkConversation: async (messageId: string) => {
      try {
        const newConversation = await window.electronAPI?.invoke('conversation:fork', messageId)

        set((state) => {
          state.conversations.push(newConversation)
          state.messages[newConversation.id] = []
        })

        return newConversation
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fork conversation'
        })
        throw error
      }
    },

    // Message Loading
    loadMessages: async (conversationId: string) => {
      set((state) => {
        state.isLoadingMessages = true
        state.error = null
      })

      try {
        const messages = (await window.electronAPI?.invoke('message:list', conversationId)) || []

        set((state) => {
          state.messages[conversationId] = messages
          state.isLoadingMessages = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to load messages'
          state.isLoadingMessages = false
        })
      }
    },

    // Selection and Navigation
    setCurrentConversation: (conversationId: string | null) => {
      set((state) => {
        state.currentConversationId = conversationId
      })

      // Load messages for the selected conversation
      if (conversationId && !get().messages[conversationId]) {
        get().loadMessages(conversationId)
      }
    },

    getCurrentConversation: () => {
      const state = get()
      return state.conversations.find((c) => c.id === state.currentConversationId) || null
    },

    getCurrentMessages: () => {
      const state = get()
      return state.currentConversationId ? state.messages[state.currentConversationId] || [] : []
    },

    // Streaming Support
    onStreamingUpdate: (messageId: string, chunk: string) => {
      set((state) => {
        // Find and update the streaming message
        for (const conversationMessages of Object.values(state.messages)) {
          const message = conversationMessages.find((m) => m.id === messageId)
          if (message) {
            // Append chunk to the last text part or create new text part
            const lastPart = message.content[message.content.length - 1]
            if (lastPart && lastPart.type === 'text') {
              lastPart.text = (lastPart.text || '') + chunk
            } else {
              message.content.push({ type: 'text', text: chunk })
            }
            break
          }
        }
      })
    },

    setStreamingState: (isStreaming: boolean, messageId?: string) => {
      set((state) => {
        state.isStreaming = isStreaming
        state.streamingMessageId = messageId || null
      })
    },

    // Utilities
    clearError: () => {
      set((state) => {
        state.error = null
      })
    },

    reset: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    }
  }))
)

// Convenience hooks
export const useCurrentConversation = () =>
  useConversationStore((state) => ({
    currentConversation: state.getCurrentConversation(),
    currentMessages: state.getCurrentMessages(),
    setCurrentConversation: state.setCurrentConversation,
    isLoadingMessages: state.isLoadingMessages
  }))

export const useConversations = () =>
  useConversationStore((state) => ({
    conversations: state.conversations,
    isLoading: state.isLoading,
    error: state.error
  }))

export const useMessageActions = () =>
  useConversationStore((state) => ({
    sendMessage: state.sendMessage,
    regenerateMessage: state.regenerateMessage,
    editMessage: state.editMessage,
    deleteMessage: state.deleteMessage,
    forkConversation: state.forkConversation,
    isSending: state.isSending
  }))

export const useStreamingState = () =>
  useConversationStore((state) => ({
    isStreaming: state.isStreaming,
    streamingMessageId: state.streamingMessageId,
    onStreamingUpdate: state.onStreamingUpdate,
    setStreamingState: state.setStreamingState
  }))

export default useConversationStore

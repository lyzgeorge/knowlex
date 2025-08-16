/**
 * Conversation state store for Knowlex Desktop Application
 * Manages conversations, messages, and chat functionality
 */

import React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Conversation, SessionSettings, Message, MessageContent } from '../../../shared/types'

const EMPTY_MESSAGES: Message[] = []

export interface ConversationState {
  // Data state
  conversations: Conversation[]
  messages: Record<string, Message[]> // conversationId -> messages
  currentConversationId: string | null

  // Temporary conversation state (no DB record until first AI response)
  pendingConversation: {
    id: string
    projectId?: string
    title: string
    createdAt: string
  } | null

  // Streaming state
  isStreaming: boolean
  streamingMessageId: string | null

  // Reasoning streaming state
  isReasoningStreaming: boolean
  reasoningStreamingMessageId: string | null

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

  // Pending conversation operations
  startNewChat: (projectId?: string) => void
  clearPendingConversation: () => void

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
  stopStreaming: (messageId: string) => Promise<void>

  // Utilities
  clearError: () => void
  reset: () => void
  initialize: () => Promise<void>
}

export interface SendMessageData {
  content: MessageContent
  files?: File[]
  parentMessageId?: string
}

const initialState = {
  conversations: [], // Start with empty conversations, load from DB
  messages: {},
  currentConversationId: null,
  pendingConversation: null,
  isStreaming: false,
  streamingMessageId: null,
  isReasoningStreaming: false,
  reasoningStreamingMessageId: null,
  isLoading: false,
  isLoadingMessages: false,
  isSending: false,
  error: null
}

// Flag to prevent duplicate event listener setup in React.StrictMode
let eventListenersSetup = false

/**
 * Set up event listeners for real-time conversation updates
 * Handles events sent from the main process via IPC
 */
function setupEventListeners() {
  // Prevent duplicate setup in React.StrictMode
  if (eventListenersSetup) {
    return
  }
  eventListenersSetup = true

  // Listen for title generation events
  window.knowlex.events.on('conversation:title_generated', (_, data: any) => {
    console.log('Received title generation event:', data)

    if (data && data.conversationId && data.title) {
      // Update the conversation title directly in the store state
      console.log(`Updating conversation title in store: ${data.conversationId} -> "${data.title}"`)

      useConversationStore.setState((state) => {
        const conv = state.conversations.find((c) => c.id === data.conversationId)
        if (conv) {
          console.log(
            `Found conversation ${data.conversationId}, updating title from "${conv.title}" to "${data.title}"`
          )
          conv.title = data.title
          conv.updatedAt = new Date().toISOString()
        } else {
          console.warn(`Conversation ${data.conversationId} not found in store`)
        }
      })
    } else {
      console.warn('Invalid title generation event data:', data)
    }
  })

  // Listen for conversation update events
  window.knowlex.events.on('conversation:updated', (_, data: any) => {
    console.log('Received conversation update event:', data)
    // Handle other conversation updates if needed
  })

  // Listen for streaming start events
  window.knowlex.events.on('message:streaming_start', (_, data: any) => {
    console.log('Received streaming start event:', data)

    if (data && data.messageId && data.message) {
      useConversationStore.setState((state) => {
        // Set streaming state
        state.isStreaming = true
        state.streamingMessageId = data.messageId

        // Add the placeholder assistant message to the conversation
        const conversationId = data.message.conversationId
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = []
        }

        // Check if message already exists (it should from the initial response)
        const existingMessageIndex = state.messages[conversationId].findIndex(
          (m) => m.id === data.messageId
        )

        if (existingMessageIndex === -1) {
          // Add the message if it doesn't exist
          state.messages[conversationId].push(data.message)
        } else {
          // Update existing message
          state.messages[conversationId][existingMessageIndex] = data.message
        }
      })
    }
  })

  // Listen for streaming chunk events
  window.knowlex.events.on('message:streaming_chunk', (_, data: any) => {
    console.log('Received streaming chunk event:', data)

    if (data && data.messageId && data.chunk) {
      useConversationStore.setState((state) => {
        // Find the streaming message and append the chunk
        for (const conversationMessages of Object.values(state.messages)) {
          const message = conversationMessages.find((m) => m.id === data.messageId)
          if (message) {
            // Append chunk to the last text part or create new text part
            const lastPart = message.content[message.content.length - 1]
            if (lastPart && lastPart.type === 'text') {
              // Replace zero-width space placeholder with first real chunk
              const currentText = lastPart.text === '\u200B' ? '' : lastPart.text || ''
              lastPart.text = currentText + data.chunk
            } else {
              message.content.push({ type: 'text', text: data.chunk })
            }
            message.updatedAt = new Date().toISOString()
            break
          }
        }
      })
    }
  })

  // Listen for streaming end events
  window.knowlex.events.on('message:streaming_end', (_, data: any) => {
    console.log('Received streaming end event:', data)

    if (data && data.messageId && data.message) {
      useConversationStore.setState((state) => {
        // Set streaming state to false
        state.isStreaming = false
        state.streamingMessageId = null

        // Update the message with the final content
        for (const conversationMessages of Object.values(state.messages)) {
          const messageIndex = conversationMessages.findIndex((m) => m.id === data.messageId)
          if (messageIndex !== -1) {
            conversationMessages[messageIndex] = data.message
            break
          }
        }
      })
    }
  })

  // Listen for streaming error events
  window.knowlex.events.on('message:streaming_error', (_, data: any) => {
    console.log('Received streaming error event:', data)

    if (data && data.messageId && data.message) {
      useConversationStore.setState((state) => {
        // Set streaming state to false
        state.isStreaming = false
        state.streamingMessageId = null

        // Update the message with the error content
        for (const conversationMessages of Object.values(state.messages)) {
          const messageIndex = conversationMessages.findIndex((m) => m.id === data.messageId)
          if (messageIndex !== -1) {
            conversationMessages[messageIndex] = data.message
            break
          }
        }

        // Set error state
        state.error = data.error || 'Streaming failed'
      })
    }
  })

  // Listen for streaming cancelled events
  window.knowlex.events.on('message:streaming_cancelled', (_, data: any) => {
    console.log('Received streaming cancelled event:', data)

    if (data && data.messageId) {
      useConversationStore.setState((state) => {
        // Set streaming state to false
        state.isStreaming = false
        state.streamingMessageId = null

        // Find and update the message to indicate it was cancelled
        for (const conversationMessages of Object.values(state.messages)) {
          const messageIndex = conversationMessages.findIndex((m) => m.id === data.messageId)
          if (messageIndex !== -1) {
            const message = conversationMessages[messageIndex]
            // Add cancellation indicator to the last text part
            const lastPart = message.content[message.content.length - 1]
            if (lastPart && lastPart.type === 'text') {
              lastPart.text = (lastPart.text || '') + '\n\n[Response cancelled by user]'
            } else {
              message.content.push({ type: 'text', text: '[Response cancelled by user]' })
            }
            message.updatedAt = new Date().toISOString()
            break
          }
        }
      })
    }
  })

  // Listen for reasoning start events
  window.knowlex.events.on('message:reasoning_start', (_, data: any) => {
    console.log('Received reasoning start event:', data)

    if (data && data.messageId) {
      useConversationStore.setState((state) => {
        // Set reasoning streaming state
        state.isReasoningStreaming = true
        state.reasoningStreamingMessageId = data.messageId

        // Find the streaming message and initialize reasoning if not already present
        for (const conversationMessages of Object.values(state.messages)) {
          const message = conversationMessages.find((m) => m.id === data.messageId)
          if (message) {
            if (!message.reasoning) {
              message.reasoning = ''
            }
            message.updatedAt = new Date().toISOString()
            break
          }
        }
      })
    }
  })

  // Listen for reasoning chunk events
  window.knowlex.events.on('message:reasoning_chunk', (_, data: any) => {
    console.log('Received reasoning chunk event:', data)

    if (data && data.messageId && data.chunk) {
      useConversationStore.setState((state) => {
        // Find the streaming message and append reasoning chunk
        for (const conversationMessages of Object.values(state.messages)) {
          const message = conversationMessages.find((m) => m.id === data.messageId)
          if (message) {
            message.reasoning = (message.reasoning || '') + data.chunk
            message.updatedAt = new Date().toISOString()
            break
          }
        }
      })
    }
  })

  // Listen for reasoning end events
  window.knowlex.events.on('message:reasoning_end', (_, data: any) => {
    console.log('[STORE] Received reasoning end event:', data)

    if (data && data.messageId) {
      useConversationStore.setState((state) => {
        console.log('[STORE] Setting reasoning streaming to false for message:', data.messageId)
        // Clear reasoning streaming state
        state.isReasoningStreaming = false
        state.reasoningStreamingMessageId = null

        // Find the streaming message and mark reasoning as complete
        for (const conversationMessages of Object.values(state.messages)) {
          const message = conversationMessages.find((m) => m.id === data.messageId)
          if (message) {
            console.log(
              '[STORE] Found message, current reasoning length:',
              message.reasoning?.length
            )
            // Reasoning is already updated by chunks, just update timestamp
            message.updatedAt = new Date().toISOString()
            break
          }
        }
      })
    }
  })

  console.log('Conversation event listeners set up')
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
        console.log('Creating conversation with:', { projectId, title: title || 'New Chat' })
        const result = await window.knowlex.conversation.create({
          projectId,
          title: title || 'New Chat'
        })

        console.log('Conversation creation result:', result)

        if (!result?.success || !result.data) {
          throw new Error(result?.error || 'Failed to create conversation')
        }

        const conversation = result.data
        console.log('Conversation created:', conversation)

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
        const result = await window.knowlex.conversation.delete(conversationId)
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to delete conversation')
        }

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
        await window.knowlex.conversation.move(conversationId, projectId)

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
        await window.knowlex.conversation.updateTitle(conversationId, title)

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
        const result = await window.knowlex.conversation.generateTitle(conversationId)

        if (!result?.success) {
          throw new Error(result?.error || 'Failed to generate title')
        }

        const title = result.data

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

    // Pending Conversation Operations
    startNewChat: (projectId?: string) => {
      set((state) => {
        // Generate temporary ID
        const tempId = `pending-${Date.now()}`
        state.pendingConversation = {
          id: tempId,
          projectId,
          title: 'New Chat',
          createdAt: new Date().toISOString()
        }
        state.currentConversationId = tempId
        // Clear any existing messages for this temp ID
        if (state.messages[tempId]) {
          delete state.messages[tempId]
        }
      })
    },

    clearPendingConversation: () => {
      set((state) => {
        if (state.pendingConversation) {
          // Clean up any messages for the pending conversation
          if (state.messages[state.pendingConversation.id]) {
            delete state.messages[state.pendingConversation.id]
          }
          state.pendingConversation = null
          if (state.currentConversationId?.startsWith('pending-')) {
            state.currentConversationId = null
          }
        }
      })
    },

    // Session Settings
    updateSessionSettings: async (conversationId: string, settings: Partial<SessionSettings>) => {
      try {
        await window.knowlex.conversation.updateSettings(conversationId, settings)

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
      // Validate that the message has meaningful content
      // Allow empty content array if there are files being processed
      if (content.length === 0) {
        const error = new Error('Message must contain at least one content part')
        set((state) => {
          state.error = error.message
        })
        throw error
      }

      const hasMeaningfulContent = content.some((part) => {
        console.log('Validating part:', JSON.stringify(part, null, 2))
        const isValidText = part.type === 'text' && part.text && part.text.trim().length > 0
        const isValidFile = part.type === 'temporary-file' && part.temporaryFile
        const isValidImage = part.type === 'image' && part.image
        const isValidCitation = part.type === 'citation' && part.citation
        const isValidToolCall = part.type === 'tool-call' && part.toolCall

        const isValid =
          isValidText || isValidFile || isValidImage || isValidCitation || isValidToolCall
        console.log('Part validation result:', {
          isValidText,
          isValidFile,
          isValidImage,
          isValidCitation,
          isValidToolCall,
          isValid
        })

        return isValid
      })

      if (!hasMeaningfulContent) {
        const error = new Error('Message must contain at least one meaningful content part')
        set((state) => {
          state.error = error.message
        })
        throw error
      }

      console.log('sendMessage called with:', {
        conversationId,
        contentParts: content.length,
        contentTypes: content.map((c) => c.type),
        hasFiles: !!files,
        fileCount: files?.length || 0,
        contentDetails: content.map((part) => ({
          type: part.type,
          ...(part.type === 'text' ? { text: part.text, textLength: part.text?.length } : {}),
          ...(part.type === 'temporary-file' ? { filename: part.temporaryFile?.filename } : {})
        }))
      })

      set((state) => {
        state.isSending = true
        state.error = null
      })

      try {
        let actualConversationId = conversationId

        // Check if this is a pending conversation that needs to be created
        const currentState = get()
        if (conversationId.startsWith('pending-') && currentState.pendingConversation) {
          console.log(
            'Creating actual conversation for pending conversation:',
            currentState.pendingConversation
          )

          // Create the actual conversation record in database
          const result = await window.knowlex.conversation.create({
            projectId: currentState.pendingConversation.projectId,
            title: currentState.pendingConversation.title
          })

          if (!result?.success || !result.data) {
            throw new Error(result?.error || 'Failed to create conversation')
          }

          const newConversation = result.data
          console.log('Actual conversation created:', newConversation)

          // Update state: add to conversations, clear pending, update current ID
          set((state) => {
            state.conversations.push(newConversation)
            // Transfer any existing messages from pending to actual conversation
            const pendingMessages = state.messages[conversationId] || []
            state.messages[newConversation.id] = pendingMessages
            delete state.messages[conversationId]

            // Clear pending conversation and update current ID
            state.currentConversationId = newConversation.id
            state.pendingConversation = null
          })

          actualConversationId = newConversation.id
        }

        // Optimistically add user message
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          conversationId: actualConversationId,
          role: 'user',
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        set((state) => {
          if (!state.messages[actualConversationId]) {
            state.messages[actualConversationId] = []
          }
          state.messages[actualConversationId].push(userMessage)
        })

        // Send message - this will now return immediately with initial messages
        // Streaming is handled by event listeners
        const result = await window.knowlex.message.send({
          conversationId: actualConversationId,
          content,
          files
        })

        // Handle successful response
        if (result?.success && result.data) {
          set((state) => {
            // Remove the temporary message and add the real messages from server
            const messages = state.messages[actualConversationId] || []
            // Remove the temporary user message
            const filteredMessages = messages.filter((m) => !m.id.startsWith('temp-'))
            // Add the real messages from server (user + initial assistant placeholder)
            state.messages[actualConversationId] = [...filteredMessages, ...result.data]
            state.isSending = false
          })
        } else {
          // Handle error response
          set((state) => {
            state.isSending = false
          })
          throw new Error(result?.error || 'Failed to send message')
        }

        // Update conversation timestamp
        set((state) => {
          const conversation = state.conversations.find((c) => c.id === actualConversationId)
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
        await window.knowlex.message.regenerate(messageId)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to regenerate message'
        })
        throw error
      }
    },

    editMessage: async (messageId: string, content: MessageContent) => {
      try {
        await window.knowlex.message.edit(messageId, content)

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
        await window.knowlex.message.delete(messageId)

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
        const result = await window.knowlex.conversation.fork(messageId)
        if (!result?.success || !result.data) {
          throw new Error(result?.error || 'Failed to fork conversation')
        }
        const newConversation = result.data

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
        const result = await window.knowlex.message.list(conversationId)
        if (!result?.success) {
          throw new Error(result?.error || 'Failed to load messages')
        }
        const messages = result.data || []

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
      const currentState = get()

      // Prevent infinite loops - only update if conversation actually changed
      if (currentState.currentConversationId === conversationId) {
        return
      }

      set((state) => {
        state.currentConversationId = conversationId
      })

      // Load messages for the selected conversation (avoid loading during initialization)
      if (
        conversationId &&
        !currentState.messages[conversationId] &&
        !currentState.isLoadingMessages
      ) {
        get().loadMessages(conversationId)
      }
    },

    getCurrentConversation: () => {
      const state = get()

      // Check if current ID is a pending conversation
      if (state.currentConversationId?.startsWith('pending-') && state.pendingConversation) {
        // Return a conversation-like object for the pending conversation
        return {
          id: state.pendingConversation.id,
          title: state.pendingConversation.title,
          projectId: state.pendingConversation.projectId || null,
          createdAt: state.pendingConversation.createdAt,
          updatedAt: state.pendingConversation.createdAt,
          settings: {} as any // Default settings
        } as Conversation
      }

      return state.conversations.find((c) => c.id === state.currentConversationId) || null
    },

    getCurrentMessages: () => {
      const state = get()
      return state.currentConversationId
        ? state.messages[state.currentConversationId] || EMPTY_MESSAGES
        : EMPTY_MESSAGES
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

    stopStreaming: async (messageId: string) => {
      try {
        console.log('Stopping streaming for message:', messageId)
        const result = await window.knowlex.message.stop(messageId)

        if (!result?.success) {
          console.warn('Failed to stop streaming:', result?.error)
          // Note: We don't throw here as the cancellation might have already completed
          // The user interaction should still feel responsive
        }
      } catch (error) {
        console.error('Error stopping streaming:', error)
        // Don't throw the error to prevent UI disruption
        // The streaming will eventually end or timeout on its own
      }
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
    },

    // Initialize store by loading conversations from database
    initialize: async () => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        // Load conversations from database
        const result = await window.knowlex.conversation.list()

        if (result?.success) {
          const conversations = result.data || []
          set((state) => {
            state.conversations = conversations
            state.isLoading = false

            // Don't automatically create pending conversation on initialization
            // Let the user action trigger conversation creation for better UX
            // if (conversations.length === 0 && !state.pendingConversation) {
            //   const tempId = `pending-${Date.now()}`
            //   state.pendingConversation = {
            //     id: tempId,
            //     title: 'New Chat',
            //     createdAt: new Date().toISOString()
            //   }
            //   state.currentConversationId = tempId
            // }
          })
        } else {
          // If database is empty, start with empty state
          set((state) => {
            state.conversations = []
            state.isLoading = false

            // Don't automatically create pending conversation on initialization
            // Let the user action trigger conversation creation for better UX
            // if (!state.pendingConversation) {
            //   const tempId = `pending-${Date.now()}`
            //   state.pendingConversation = {
            //     id: tempId,
            //     title: 'New Chat',
            //     createdAt: new Date().toISOString()
            //   }
            //   state.currentConversationId = tempId
            // }
          })
        }

        // Set up event listeners for real-time updates
        setupEventListeners()
      } catch (error) {
        console.error('Failed to initialize conversations:', error)
        set((state) => {
          state.conversations = []
          state.isLoading = false
          state.error = error instanceof Error ? error.message : 'Failed to load conversations'

          // Don't automatically create pending conversation on error
          // Let the user action trigger conversation creation for better UX
          // if (!state.pendingConversation) {
          //   const tempId = `pending-${Date.now()}`
          //   state.pendingConversation = {
          //     id: tempId,
          //     title: 'New Chat',
          //     createdAt: new Date().toISOString()
          //   }
          //   state.currentConversationId = tempId
          // }
        })
      }
    }
  }))
)

// Individual selectors to avoid object creation in selectors
export const useCurrentConversation = () => {
  const currentConversationId = useConversationStore((state) => state.currentConversationId)
  const conversations = useConversationStore((state) => state.conversations)
  const pendingConversation = useConversationStore((state) => state.pendingConversation)
  const messages = useConversationStore((state) => state.messages)
  const setCurrentConversation = useConversationStore((state) => state.setCurrentConversation)
  const isLoadingMessages = useConversationStore((state) => state.isLoadingMessages)

  const currentConversation = React.useMemo(() => {
    if (!currentConversationId) return null

    if (currentConversationId.startsWith('pending-') && pendingConversation) {
      return {
        id: pendingConversation.id,
        title: pendingConversation.title,
        projectId: pendingConversation.projectId || null,
        createdAt: pendingConversation.createdAt,
        updatedAt: pendingConversation.createdAt,
        settings: {} as any
      } as Conversation
    }

    return conversations.find((c) => c.id === currentConversationId) || null
  }, [currentConversationId, conversations, pendingConversation])

  const currentMessages = React.useMemo(() => {
    return currentConversationId
      ? messages[currentConversationId] || EMPTY_MESSAGES
      : EMPTY_MESSAGES
  }, [currentConversationId, messages])

  return {
    currentConversation,
    currentMessages,
    setCurrentConversation,
    isLoadingMessages
  }
}

// Individual selectors to prevent re-render loops
export const useConversations = () => useConversationStore((state) => state.conversations)
export const useConversationsLoading = () => useConversationStore((state) => state.isLoading)
export const useConversationsError = () => useConversationStore((state) => state.error)
export const useStartNewChat = () => useConversationStore((state) => state.startNewChat)

// Individual selectors to prevent re-render loops
export const useSendMessage = () => useConversationStore((state) => state.sendMessage)
export const useRegenerateMessage = () => useConversationStore((state) => state.regenerateMessage)
export const useEditMessage = () => useConversationStore((state) => state.editMessage)
export const useDeleteMessage = () => useConversationStore((state) => state.deleteMessage)
export const useForkConversation = () => useConversationStore((state) => state.forkConversation)
export const useIsSending = () => useConversationStore((state) => state.isSending)

// Individual selectors to prevent re-render loops
export const useIsStreaming = () => useConversationStore((state) => state.isStreaming)
export const useStreamingMessageId = () => useConversationStore((state) => state.streamingMessageId)
export const useOnStreamingUpdate = () => useConversationStore((state) => state.onStreamingUpdate)
export const useSetStreamingState = () => useConversationStore((state) => state.setStreamingState)
export const useStopStreaming = () => useConversationStore((state) => state.stopStreaming)

// Reasoning streaming selectors
export const useIsReasoningStreaming = () =>
  useConversationStore((state) => state.isReasoningStreaming)
export const useReasoningStreamingMessageId = () =>
  useConversationStore((state) => state.reasoningStreamingMessageId)

export default useConversationStore

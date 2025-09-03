/**
 * Conversation Store Types
 * Central type definitions for the conversation store
 */

import type { Conversation, SessionSettings } from '@shared/types/conversation'
import type { Message, MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'
import type { MessageStore } from './message-index'

export interface ConversationState extends MessageStore {
  // Core data
  conversations: Conversation[]
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

  // Actions
  initialize: () => Promise<void>
  reset: () => void
  clearError: () => void
  cleanup: () => void

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

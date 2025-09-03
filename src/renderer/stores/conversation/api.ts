/**
 * API Layer for Conversation Store
 * Abstracts all IPC calls for better testability and separation of concerns
 */

import type { Conversation, SessionSettings } from '@shared/types/conversation'
import type { Message, MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'

export interface ConversationApiInterface {
  // Conversations
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
  // Messages
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

// Production implementations
export const conversationApi: ConversationApiInterface = {
  create: (params) => window.knowlex.conversation.create(params) as Promise<any>,
  update: (params) => window.knowlex.conversation.update(params) as Promise<any>,
  delete: (conversationId) => window.knowlex.conversation.delete(conversationId) as Promise<any>,
  updateTitle: (conversationId, title) =>
    window.knowlex.conversation.updateTitle(conversationId, title) as Promise<any>,
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
  edit: (messageId, content) => window.knowlex.message.edit(messageId, content) as Promise<any>,
  delete: (messageId) => window.knowlex.message.delete(messageId) as Promise<any>,
  stop: (messageId) => window.knowlex.message.stop(messageId) as Promise<any>,
  list: (conversationId) => window.knowlex.message.list(conversationId) as Promise<any>
}

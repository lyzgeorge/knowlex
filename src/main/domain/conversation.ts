import type { Conversation, SessionSettings } from '@shared/types/conversation-types'

export interface ConversationCreateInput {
  title?: string
  settings?: SessionSettings
  projectId?: string | null
  modelConfigId?: string | null
}

export interface ConversationUpdateInput {
  title?: string
  settings?: SessionSettings
  projectId?: string | null
  modelConfigId?: string | null
}

export interface ConversationPaginationResult {
  conversations: Conversation[]
  hasMore: boolean
}

export interface ConversationRepository {
  insert(conversation: Omit<Conversation, 'createdAt' | 'updatedAt'>): Promise<void>
  findById(conversationId: string): Promise<Conversation | null>
  list(limit?: number, offset?: number): Promise<Conversation[]>
  update(
    conversationId: string,
    updates: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void>
  delete(conversationId: string): Promise<void>
  listByProject(projectId: string): Promise<Conversation[]>
}

export interface ConversationUseCases {
  createConversation(input: ConversationCreateInput): Promise<Conversation>
  getConversation(conversationId: string): Promise<Conversation | null>
  listConversations(): Promise<Conversation[]>
  listConversationsPaginated(limit: number, offset: number): Promise<ConversationPaginationResult>
  listConversationsByProject(projectId: string): Promise<Conversation[]>
  updateConversation(
    conversationId: string,
    updates: ConversationUpdateInput
  ): Promise<Conversation>
  deleteConversation(conversationId: string): Promise<void>
  moveConversation(conversationId: string, projectId: string | null): Promise<void>
}

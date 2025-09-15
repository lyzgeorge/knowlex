import {
  createConversation as dbCreateConversation,
  getConversation as dbGetConversation,
  listConversations as dbListConversations,
  updateConversation as dbUpdateConversation,
  deleteConversation as dbDeleteConversation
} from '@main/database/queries'
import { generateId } from '@shared/utils/id'
import { formatOperationError } from '@shared/utils/error-handling'
import type { Conversation, SessionSettings } from '@shared/types/conversation-types'

/**
 * Conversation management service
 */

export interface CreateConversationData {
  title?: string
  settings?: SessionSettings
  projectId?: string | null
  modelConfigId?: string | null
}

export interface UpdateConversationData {
  title?: string
  settings?: SessionSettings
  projectId?: string | null
}

// Allow updating the modelConfigId for a conversation
export interface UpdateConversationDataWithModel extends UpdateConversationData {
  modelConfigId?: string | null
}

/**
 * Creates a new conversation
 */
export async function createConversation(data: CreateConversationData): Promise<Conversation> {
  // Input validation
  if (data.title && data.title.trim().length > 200) {
    throw new Error('Conversation title must be 200 characters or less')
  }

  const conversationId = generateId()
  const now = new Date().toISOString()

  const newConversation: Conversation = {
    id: conversationId,
    title: data.title?.trim() || 'New Chat',
    createdAt: now,
    updatedAt: now,
    projectId: data.projectId ?? null,
    modelConfigId: data.modelConfigId ?? null
  }

  if (data.settings) {
    newConversation.settings = data.settings
  }

  try {
    await dbCreateConversation(newConversation)
    console.log(`Conversation created successfully: ${conversationId} - ${newConversation.title}`)
    return newConversation
  } catch (error) {
    console.error('Failed to create conversation:', error)
    throw new Error(formatOperationError('create conversation', error))
  }
}

/**
 * Retrieves a conversation by ID
 * Returns null if conversation is not found
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  if (!id || id.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  try {
    const conversation = await dbGetConversation(id.trim())
    return conversation
  } catch (error) {
    console.error(`Failed to get conversation ${id}:`, error)
    throw new Error(formatOperationError('retrieve conversation', error))
  }
}

/**
 * Lists all conversations, optionally filtered by project
 * Returns conversations ordered by last updated date
 */
export async function listConversations(): Promise<Conversation[]> {
  try {
    const conversations = await dbListConversations()
    return conversations
  } catch (error) {
    console.error('Failed to list conversations:', error)
    throw new Error(formatOperationError('list conversations', error))
  }
}

/**
 * Lists conversations with pagination
 */
export async function listConversationsPaginated(
  limit: number,
  offset: number
): Promise<{ conversations: Conversation[]; hasMore: boolean }> {
  try {
    // Get one extra conversation to determine if there are more
    const conversations = await dbListConversations(limit + 1, offset)

    const hasMore = conversations.length > limit
    const resultConversations = hasMore ? conversations.slice(0, limit) : conversations

    return {
      conversations: resultConversations,
      hasMore
    }
  } catch (error) {
    console.error('Failed to list conversations with pagination:', error)
    throw new Error(formatOperationError('list conversations', error))
  }
}

/**
 * Updates a conversation
 */
export async function updateConversation(
  id: string,
  data: UpdateConversationDataWithModel
): Promise<Conversation> {
  if (!id || id.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  // Check if conversation exists
  const existingConversation = await dbGetConversation(id.trim())
  if (!existingConversation) {
    throw new Error('Conversation not found')
  }

  // Input validation
  if (data.title !== undefined) {
    if (data.title.trim().length === 0) {
      throw new Error('Conversation title cannot be empty')
    }

    if (data.title.trim().length > 200) {
      throw new Error('Conversation title must be 200 characters or less')
    }
  }

  // Prepare update data
  const updates: Partial<Pick<Conversation, 'title' | 'settings' | 'projectId' | 'modelConfigId'>> =
    {}
  if (data.title !== undefined) {
    updates.title = data.title.trim()
  }
  if (data.settings !== undefined) {
    updates.settings = data.settings
  }
  if (data.projectId !== undefined) {
    updates.projectId = data.projectId
  }
  if ((data as any).modelConfigId !== undefined) {
    // Allow null to unset the model config, or a string id to set it
    updates.modelConfigId = (data as any).modelConfigId
  }

  // Only proceed if there are actual changes
  if (Object.keys(updates).length === 0) {
    return existingConversation
  }

  try {
    await dbUpdateConversation(id, updates)

    // Fetch and return updated conversation
    const updatedConversation = await dbGetConversation(id)
    if (!updatedConversation) {
      throw new Error('Failed to retrieve updated conversation')
    }

    console.log(`Conversation updated successfully: ${id} - ${updatedConversation.title}`)
    return updatedConversation
  } catch (error) {
    console.error(`Failed to update conversation ${id}:`, error)
    throw new Error(formatOperationError('update conversation', error))
  }
}

/**
 * Deletes a conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  // Check if conversation exists
  const existingConversation = await dbGetConversation(id.trim())
  if (!existingConversation) {
    throw new Error('Conversation not found')
  }

  try {
    // Database cascading delete will handle messages
    await dbDeleteConversation(id)

    console.log(`Conversation deleted successfully: ${id} - ${existingConversation.title}`)
  } catch (error) {
    console.error(`Failed to delete conversation ${id}:`, error)
    throw new Error(formatOperationError('delete conversation', error))
  }
}

/**
 * Generates a title for a conversation
 */
// Manual title generation has been removed; auto-generation is handled by
// attemptInitialTitleGeneration() in title-generation.ts after first exchange.

/**
 * Moves a conversation to a project
 */
export async function moveConversation(
  conversationId: string,
  projectId: string | null
): Promise<void> {
  if (!conversationId || !conversationId.trim()) {
    throw new Error('Conversation ID is required')
  }
  // Ensure conversation exists
  const existing = await dbGetConversation(conversationId.trim())
  if (!existing) throw new Error('Conversation not found')

  await dbUpdateConversation(conversationId.trim(), { projectId })
}

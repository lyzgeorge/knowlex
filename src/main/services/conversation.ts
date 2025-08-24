import {
  createConversation as dbCreateConversation,
  getConversation as dbGetConversation,
  listConversations as dbListConversations,
  updateConversation as dbUpdateConversation,
  deleteConversation as dbDeleteConversation
} from '@main/database/queries'
import { generateId } from '@shared/utils/id'
import type { Conversation, SessionSettings } from '@shared/types/conversation'

/**
 * Conversation Management Service
 * Handles business logic for conversation CRUD operations
 * Provides validation, error handling, and coordination between different components
 */

export interface CreateConversationData {
  title?: string
  settings?: SessionSettings
}

export interface UpdateConversationData {
  title?: string
  settings?: SessionSettings
}

/**
 * Creates a new conversation with generated ID and default values
 * Validates input data and ensures business rules are met
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
    updatedAt: now
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
    throw new Error(
      `Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
    throw new Error(
      `Failed to retrieve conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
    throw new Error(
      `Failed to list conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Lists conversations with pagination support
 * Returns conversations ordered by last updated date with hasMore flag
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
    throw new Error(
      `Failed to list conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Updates an existing conversation
 * Validates input and ensures conversation exists
 */
export async function updateConversation(
  id: string,
  data: UpdateConversationData
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
  const updates: Partial<Pick<Conversation, 'title' | 'settings'>> = {}
  if (data.title !== undefined) {
    updates.title = data.title.trim()
  }
  if (data.settings !== undefined) {
    updates.settings = data.settings
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
    throw new Error(
      `Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Deletes a conversation and all its related messages
 * Includes confirmation of deletion by checking if conversation exists first
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
    throw new Error(
      `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generates a meaningful title for a conversation based on its content
 * Uses the independent title generation service
 */
export async function generateConversationTitle(id: string): Promise<string> {
  if (!id || id.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  // Check if conversation exists
  const conversation = await dbGetConversation(id.trim())
  if (!conversation) {
    throw new Error('Conversation not found')
  }

  try {
    // Use the independent title generation service
    const { generateTitleForConversation } = await import('./title-generation')
    const title = await generateTitleForConversation(id)

    console.log(`Generated title for conversation ${id}: "${title}"`)
    return title
  } catch (error) {
    console.error(`Failed to generate title for conversation ${id}:`, error)
    return 'New Chat'
  }
}

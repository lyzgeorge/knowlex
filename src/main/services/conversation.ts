import {
  createConversation as dbCreateConversation,
  getConversation as dbGetConversation,
  listConversations as dbListConversations,
  updateConversation as dbUpdateConversation,
  deleteConversation as dbDeleteConversation
} from '../database/queries'
import { generateId } from '../../shared/utils/id'
import type { Conversation, SessionSettings } from '../../shared/types'

/**
 * Conversation Management Service
 * Handles business logic for conversation CRUD operations
 * Provides validation, error handling, and coordination between different components
 */

export interface CreateConversationData {
  projectId?: string
  title?: string
  settings?: SessionSettings
}

export interface UpdateConversationData {
  title?: string
  projectId?: string
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

  if (data.projectId && typeof data.projectId !== 'string') {
    throw new Error('Project ID must be a valid string')
  }

  const conversationId = generateId()
  const now = new Date().toISOString()

  const newConversation: Conversation = {
    id: conversationId,
    projectId: data.projectId?.trim() || undefined,
    title: data.title?.trim() || 'New Conversation',
    settings: data.settings,
    createdAt: now,
    updatedAt: now
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
export async function listConversations(projectId?: string): Promise<Conversation[]> {
  try {
    const conversations = await dbListConversations(projectId)
    return conversations
  } catch (error) {
    console.error('Failed to list conversations:', error)
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

  if (
    data.projectId !== undefined &&
    data.projectId !== null &&
    typeof data.projectId !== 'string'
  ) {
    throw new Error('Project ID must be a valid string')
  }

  // Prepare update data
  const updates: Partial<Pick<Conversation, 'title' | 'projectId' | 'settings'>> = {}
  if (data.title !== undefined) {
    updates.title = data.title.trim()
  }
  if (data.projectId !== undefined) {
    updates.projectId = data.projectId?.trim() || undefined
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
 * Moves a conversation between projects
 * Special case of conversation update that handles project association
 */
export async function moveConversation(
  id: string,
  targetProjectId: string | null
): Promise<Conversation> {
  if (!id || id.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  // Check if conversation exists
  const existingConversation = await dbGetConversation(id.trim())
  if (!existingConversation) {
    throw new Error('Conversation not found')
  }

  try {
    const updatedConversation = await updateConversation(id, {
      projectId: targetProjectId || undefined
    })

    const action = targetProjectId ? 'moved to project' : 'moved out of project'
    console.log(`Conversation ${action}: ${id} - ${updatedConversation.title}`)

    return updatedConversation
  } catch (error) {
    console.error(`Failed to move conversation ${id}:`, error)
    throw new Error(
      `Failed to move conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Updates conversation settings
 * Specialized method for updating session-specific settings
 */
export async function updateConversationSettings(
  id: string,
  settings: SessionSettings
): Promise<Conversation> {
  if (!id || id.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  if (!settings || typeof settings !== 'object') {
    throw new Error('Valid settings object is required')
  }

  try {
    const updatedConversation = await updateConversation(id, { settings })
    console.log(`Conversation settings updated: ${id}`)
    return updatedConversation
  } catch (error) {
    console.error(`Failed to update conversation settings ${id}:`, error)
    throw new Error(
      `Failed to update conversation settings: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generates a meaningful title for a conversation based on its content
 * This would typically call an AI service to analyze the conversation and generate a title
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
    // TODO: Implement AI-based title generation
    // For now, return a placeholder implementation
    const timestamp = new Date().toLocaleDateString()
    const fallbackTitle = `Conversation ${timestamp}`

    console.log(`Generated title for conversation ${id}: ${fallbackTitle}`)
    return fallbackTitle
  } catch (error) {
    console.error(`Failed to generate title for conversation ${id}:`, error)
    throw new Error(
      `Failed to generate conversation title: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

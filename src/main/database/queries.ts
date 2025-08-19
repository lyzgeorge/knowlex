import { executeQuery } from './index'
import type { Project, Conversation, Message, MessageContent } from '../../shared/types'

/**
 * Simplified database queries for Knowlex
 * Only includes queries that are actually being used
 */

// ============================================================================
// Project Queries (Basic - Only Read Operations)
// ============================================================================

export async function getProject(id: string): Promise<Project | null> {
  const result = await executeQuery(
    `
    SELECT id, name, description, created_at, updated_at
    FROM projects
    WHERE id = ?
  `,
    [id]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0] as any
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export async function listProjects(): Promise<Project[]> {
  const result = await executeQuery(`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    ORDER BY updated_at DESC
  `)

  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

// ============================================================================
// Conversation Queries
// ============================================================================

export async function createConversation(
  conversation: Omit<Conversation, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await executeQuery(
    `
    INSERT INTO conversations (id, project_id, title, settings)
    VALUES (?, ?, ?, ?)
  `,
    [
      conversation.id,
      conversation.projectId || null,
      conversation.title,
      conversation.settings ? JSON.stringify(conversation.settings) : null
    ]
  )
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const result = await executeQuery(
    `
    SELECT id, project_id, title, created_at, updated_at, settings
    FROM conversations
    WHERE id = ?
  `,
    [id]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0] as any
  return {
    id: row.id,
    projectId: row.project_id || undefined,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settings: row.settings ? JSON.parse(row.settings) : undefined
  }
}

export async function listConversations(projectId?: string): Promise<Conversation[]> {
  const sql = projectId
    ? 'SELECT id, project_id, title, created_at, updated_at, settings FROM conversations WHERE project_id = ? ORDER BY updated_at DESC'
    : 'SELECT id, project_id, title, created_at, updated_at, settings FROM conversations ORDER BY updated_at DESC'

  const params = projectId ? [projectId] : []
  const result = await executeQuery(sql, params)

  return result.rows.map((r: any) => ({
    id: r.id,
    projectId: r.project_id || undefined,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    settings: r.settings ? JSON.parse(r.settings) : undefined
  }))
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'title' | 'projectId' | 'settings'>>
): Promise<void> {
  const setParts: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) {
    setParts.push('title = ?')
    values.push(updates.title)
  }
  if (updates.projectId !== undefined) {
    setParts.push('project_id = ?')
    values.push(updates.projectId || null)
  }
  if (updates.settings !== undefined) {
    setParts.push('settings = ?')
    values.push(updates.settings ? JSON.stringify(updates.settings) : null)
  }

  if (setParts.length === 0) return

  setParts.push("updated_at = datetime('now')")
  values.push(id)

  await executeQuery(
    `
    UPDATE conversations
    SET ${setParts.join(', ')}
    WHERE id = ?
  `,
    values as any[]
  )
}

export async function deleteConversation(id: string): Promise<void> {
  // Cascading delete will handle messages
  await executeQuery('DELETE FROM conversations WHERE id = ?', [id])
}

// ============================================================================
// Message Queries
// ============================================================================

export async function createMessage(
  message: Omit<Message, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await executeQuery(
    `
    INSERT INTO messages (id, conversation_id, role, content, parent_message_id)
    VALUES (?, ?, ?, ?, ?)
  `,
    [
      message.id,
      message.conversationId,
      message.role,
      JSON.stringify(message.content),
      message.parentMessageId || null
    ]
  )
}

export async function getMessage(id: string): Promise<Message | null> {
  const result = await executeQuery(
    `
    SELECT id, conversation_id, role, content, created_at, updated_at, parent_message_id
    FROM messages
    WHERE id = ?
  `,
    [id]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0] as any
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: JSON.parse(row.content),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentMessageId: row.parent_message_id || undefined
  }
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  const result = await executeQuery(
    `
    SELECT id, conversation_id, role, content, created_at, updated_at, parent_message_id
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `,
    [conversationId]
  )

  return result.rows.map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: JSON.parse(row.content),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parentMessageId: row.parent_message_id || undefined
  }))
}

export async function updateMessage(id: string, content: MessageContent): Promise<void> {
  await executeQuery(
    `
    UPDATE messages
    SET content = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
    [JSON.stringify(content), id]
  )
}

export async function deleteMessage(id: string): Promise<void> {
  await executeQuery('DELETE FROM messages WHERE id = ?', [id])
}

// ============================================================================
// Search Queries (for FTS)
// ============================================================================

export interface SearchResultRow {
  messageId: string
  content: string
  conversationTitle: string
  projectName: string
  rank: number
}

export async function searchMessages(query: string, limit = 20): Promise<SearchResultRow[]> {
  const result = await executeQuery(
    `
    SELECT message_id, content, conversation_title, project_name, rank
    FROM messages_fts
    WHERE messages_fts MATCH ?
    ORDER BY rank ASC
    LIMIT ?
  `,
    [query, limit]
  )

  return result.rows.map((r: any) => ({
    messageId: r.message_id,
    content: r.content,
    conversationTitle: r.conversation_title || '',
    projectName: r.project_name || '',
    rank: r.rank
  }))
}

// ============================================================================
// Stats Queries (Basic project stats for UI)
// ============================================================================

export async function getProjectStats(projectId: string): Promise<{
  conversationCount: number
  messageCount: number
  fileCount: number
  totalFileSize: number
}> {
  const result = await executeQuery(
    `
    SELECT
      (SELECT COUNT(*) FROM conversations WHERE project_id = ?) as conversation_count,
      (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.project_id = ?) as message_count,
      (SELECT COUNT(*) FROM project_files WHERE project_id = ?) as file_count,
      (SELECT COALESCE(SUM(size), 0) FROM project_files WHERE project_id = ?) as total_file_size
  `,
    [projectId, projectId, projectId, projectId]
  )

  const row = result.rows[0] as any
  return {
    conversationCount: row.conversation_count || 0,
    messageCount: row.message_count || 0,
    fileCount: row.file_count || 0,
    totalFileSize: row.total_file_size || 0
  }
}

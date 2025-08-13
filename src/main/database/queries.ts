import { executeQuery } from './index'
import type {
  Project,
  ProjectFile,
  ProjectMemory,
  Conversation,
  Message,
  SessionSettings,
  MessageContent,
  FileStatus
} from '../../shared/types'

/**
 * Type-safe database queries for Knowlex
 * Provides predefined queries with proper TypeScript typing
 */

// ============================================================================
// Project Queries
// ============================================================================

export async function createProject(
  project: Omit<Project, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await executeQuery(
    `
    INSERT INTO projects (id, name, description)
    VALUES (?, ?, ?)
  `,
    [project.id, project.name, project.description]
  )
}

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

  return result.rows.map((row) => {
    const r = row as any
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  })
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'description'>>
): Promise<void> {
  const setParts: string[] = []
  const values: unknown[] = []

  if (updates.name !== undefined) {
    setParts.push('name = ?')
    values.push(updates.name)
  }
  if (updates.description !== undefined) {
    setParts.push('description = ?')
    values.push(updates.description)
  }

  if (setParts.length === 0) return

  setParts.push("updated_at = datetime('now')")
  values.push(id)

  await executeQuery(
    `
    UPDATE projects
    SET ${setParts.join(', ')}
    WHERE id = ?
  `,
    values
  )
}

export async function deleteProject(id: string): Promise<void> {
  // Cascading delete will handle related records
  await executeQuery('DELETE FROM projects WHERE id = ?', [id])
}

// ============================================================================
// Project File Queries
// ============================================================================

export async function createProjectFile(
  file: Omit<ProjectFile, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await executeQuery(
    `
    INSERT INTO project_files (
      id, project_id, filename, filepath, status, chunk_count, size, mime_type, error
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      file.id,
      file.projectId,
      file.filename,
      file.filepath,
      file.status,
      file.chunkCount,
      file.size,
      file.mimeType,
      file.error || null
    ]
  )
}

export async function getProjectFile(id: string): Promise<ProjectFile | null> {
  const result = await executeQuery(
    `
    SELECT id, project_id, filename, filepath, status, chunk_count, size, mime_type, created_at, updated_at, error
    FROM project_files
    WHERE id = ?
  `,
    [id]
  )

  if (result.rows.length === 0) return null

  const row = result.rows[0] as any
  return {
    id: row.id,
    projectId: row.project_id,
    filename: row.filename,
    filepath: row.filepath,
    status: row.status as FileStatus,
    chunkCount: row.chunk_count,
    size: row.size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    error: row.error || undefined
  }
}

export async function listProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const result = await executeQuery(
    `
    SELECT id, project_id, filename, filepath, status, chunk_count, size, mime_type, created_at, updated_at, error
    FROM project_files
    WHERE project_id = ?
    ORDER BY created_at DESC
  `,
    [projectId]
  )

  return result.rows.map((row) => {
    const r = row as any
    return {
      id: r.id,
      projectId: r.project_id,
      filename: r.filename,
      filepath: r.filepath,
      status: r.status as FileStatus,
      chunkCount: r.chunk_count,
      size: r.size,
      mimeType: r.mime_type,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      error: r.error || undefined
    }
  })
}

export async function updateProjectFileStatus(
  id: string,
  status: FileStatus,
  error?: string
): Promise<void> {
  await executeQuery(
    `
    UPDATE project_files
    SET status = ?, error = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
    [status, error || null, id]
  )
}

export async function updateProjectFileChunks(id: string, chunkCount: number): Promise<void> {
  await executeQuery(
    `
    UPDATE project_files
    SET chunk_count = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
    [chunkCount, id]
  )
}

export async function deleteProjectFile(id: string): Promise<void> {
  await executeQuery('DELETE FROM project_files WHERE id = ?', [id])
}

// ============================================================================
// Project Memory Queries
// ============================================================================

export async function createProjectMemory(
  memory: Omit<ProjectMemory, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await executeQuery(
    `
    INSERT INTO project_memories (id, project_id, content, priority)
    VALUES (?, ?, ?, ?)
  `,
    [memory.id, memory.projectId, memory.content, memory.priority]
  )
}

export async function listProjectMemories(projectId: string): Promise<ProjectMemory[]> {
  const result = await executeQuery(
    `
    SELECT id, project_id, content, priority, created_at, updated_at
    FROM project_memories
    WHERE project_id = ?
    ORDER BY priority DESC, created_at ASC
  `,
    [projectId]
  )

  return result.rows.map((row) => {
    const r = row as any
    return {
      id: r.id,
      projectId: r.project_id,
      content: r.content,
      priority: r.priority,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  })
}

export async function updateProjectMemory(
  id: string,
  updates: Partial<Pick<ProjectMemory, 'content' | 'priority'>>
): Promise<void> {
  const setParts: string[] = []
  const values: unknown[] = []

  if (updates.content !== undefined) {
    setParts.push('content = ?')
    values.push(updates.content)
  }
  if (updates.priority !== undefined) {
    setParts.push('priority = ?')
    values.push(updates.priority)
  }

  if (setParts.length === 0) return

  setParts.push("updated_at = datetime('now')")
  values.push(id)

  await executeQuery(
    `
    UPDATE project_memories
    SET ${setParts.join(', ')}
    WHERE id = ?
  `,
    values
  )
}

export async function deleteProjectMemory(id: string): Promise<void> {
  await executeQuery('DELETE FROM project_memories WHERE id = ?', [id])
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
    settings: row.settings ? (JSON.parse(row.settings) as SessionSettings) : undefined
  }
}

export async function listConversations(projectId?: string): Promise<Conversation[]> {
  const sql = projectId
    ? 'SELECT id, project_id, title, created_at, updated_at, settings FROM conversations WHERE project_id = ? ORDER BY updated_at DESC'
    : 'SELECT id, project_id, title, created_at, updated_at, settings FROM conversations ORDER BY updated_at DESC'

  const params = projectId ? [projectId] : []
  const result = await executeQuery(sql, params)

  return result.rows.map((row) => {
    const r = row as any
    return {
      id: r.id,
      projectId: r.project_id || undefined,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      settings: r.settings ? (JSON.parse(r.settings) as SessionSettings) : undefined
    }
  })
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
    values
  )
}

export async function deleteConversation(id: string): Promise<void> {
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
    content: JSON.parse(row.content) as MessageContent,
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

  return result.rows.map((row) => {
    const r = row as any
    return {
      id: r.id,
      conversationId: r.conversation_id,
      role: r.role,
      content: JSON.parse(r.content) as MessageContent,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      parentMessageId: r.parent_message_id || undefined
    }
  })
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
// File Chunk Queries (for RAG)
// ============================================================================

export interface FileChunk {
  id: string
  fileId: string
  content: string
  chunkIndex: number
  embedding?: number[] // Vector embedding
  metadata?: Record<string, unknown>
  createdAt: string
}

export async function createFileChunk(chunk: Omit<FileChunk, 'createdAt'>): Promise<void> {
  await executeQuery(
    `
    INSERT INTO file_chunks (id, file_id, content, chunk_index, embedding, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      chunk.id,
      chunk.fileId,
      chunk.content,
      chunk.chunkIndex,
      chunk.embedding ? JSON.stringify(chunk.embedding) : null,
      chunk.metadata ? JSON.stringify(chunk.metadata) : null
    ]
  )
}

export async function listFileChunks(fileId: string): Promise<FileChunk[]> {
  const result = await executeQuery(
    `
    SELECT id, file_id, content, chunk_index, embedding, metadata, created_at
    FROM file_chunks
    WHERE file_id = ?
    ORDER BY chunk_index ASC
  `,
    [fileId]
  )

  return result.rows.map((row) => {
    const r = row as any
    return {
      id: r.id,
      fileId: r.file_id,
      content: r.content,
      chunkIndex: r.chunk_index,
      embedding: r.embedding ? JSON.parse(r.embedding) : undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      createdAt: r.created_at
    }
  })
}

export async function deleteFileChunks(fileId: string): Promise<void> {
  await executeQuery('DELETE FROM file_chunks WHERE file_id = ?', [fileId])
}

// ============================================================================
// Search Queries
// ============================================================================

export interface SearchResult {
  messageId: string
  content: string
  conversationTitle: string
  projectName: string
  rank: number
}

export async function searchMessages(query: string, limit: number = 10): Promise<SearchResult[]> {
  const result = await executeQuery(
    `
    SELECT message_id, content, conversation_title, project_name, rank
    FROM messages_fts
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `,
    [query, limit]
  )

  return result.rows.map((row) => {
    const r = row as any
    return {
      messageId: r.message_id,
      content: r.content,
      conversationTitle: r.conversation_title,
      projectName: r.project_name || '',
      rank: r.rank
    }
  })
}

// ============================================================================
// Settings Queries
// ============================================================================

export async function getSetting(key: string): Promise<string | null> {
  const result = await executeQuery(
    `
    SELECT value FROM app_settings WHERE key = ?
  `,
    [key]
  )

  if (result.rows.length === 0) return null
  return (result.rows[0] as any).value
}

export async function setSetting(key: string, value: string): Promise<void> {
  await executeQuery(
    `
    INSERT OR REPLACE INTO app_settings (key, value)
    VALUES (?, ?)
  `,
    [key, value]
  )
}

export async function deleteSetting(key: string): Promise<void> {
  await executeQuery('DELETE FROM app_settings WHERE key = ?', [key])
}

// ============================================================================
// Utility Queries
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

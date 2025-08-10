import { randomUUID, createHash } from 'crypto'
import type {
  Project,
  Conversation,
  Message,
  ProjectFile,
  TextChunk,
  ProjectMemory,
  KnowledgeCard,
  AppSettings
} from '@knowlex/shared-types'

/**
 * 生成唯一ID
 */
export function generateId(): string {
  return randomUUID()
}

/**
 * 获取当前时间戳
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * libsql 行转换为项目对象
 */
export function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

/**
 * libsql 行转换为会话对象
 */
export function rowToConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    title: row.title as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

/**
 * libsql 行转换为消息对象
 */
export function rowToMessage(row: Record<string, unknown>): Message {
  const message: Message = {
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    role: row.role as 'user' | 'assistant',
    content: row.content as string,
    created_at: row.created_at as string
  }

  // 解析 metadata 中的文件信息
  if (row.metadata) {
    try {
      const metadata = JSON.parse(row.metadata as string)
      if (metadata.files) {
        message.files = metadata.files
      }
    } catch (error) {
      console.warn('Failed to parse message metadata:', error)
    }
  }

  return message
}

/**
 * libsql 行转换为项目文件对象
 */
export function rowToProjectFile(row: Record<string, unknown>): ProjectFile {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    filename: row.filename as string,
    filepath: row.filepath as string,
    file_size: row.file_size as number,
    file_hash: row.file_hash as string,
    status: row.status as 'processing' | 'completed' | 'failed',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

/**
 * libsql 行转换为文本块对象
 */
export function rowToTextChunk(row: Record<string, unknown>): TextChunk {
  const chunk: TextChunk = {
    id: row.id as string,
    file_id: row.file_id as string,
    content: row.content as string,
    chunk_index: row.chunk_index as number,
    created_at: row.created_at as string
  }

  // 解析 libsql VECTOR 类型的向量数据
  if (row.embedding) {
    try {
      // libsql VECTOR 类型可以直接解析为数组
      if (typeof row.embedding === 'string') {
        chunk.embedding = JSON.parse(row.embedding)
      } else if (Array.isArray(row.embedding)) {
        chunk.embedding = row.embedding
      }
    } catch (error) {
      console.warn('Failed to parse embedding data:', error)
    }
  }

  return chunk
}

/**
 * libsql 行转换为项目记忆对象
 */
export function rowToProjectMemory(row: Record<string, unknown>): ProjectMemory {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    type: row.type as 'user' | 'system',
    content: row.content as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

/**
 * libsql 行转换为知识卡片对象
 */
export function rowToKnowledgeCard(row: Record<string, unknown>): KnowledgeCard {
  const card: KnowledgeCard = {
    id: row.id as string,
    project_id: row.project_id as string,
    title: row.title as string,
    content: row.content as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }

  // 解析标签
  if (row.tags) {
    try {
      card.tags = JSON.parse(row.tags as string)
    } catch (error) {
      console.warn('Failed to parse knowledge card tags:', error)
      card.tags = []
    }
  }

  return card
}

/**
 * libsql 行转换为应用设置对象
 */
export function rowToAppSettings(row: Record<string, unknown>): AppSettings {
  return {
    id: (row.id || row.key) as string,
    key: row.key as string,
    value: row.value as string,
    updated_at: row.updated_at as string
  }
}

/**
 * 向量数据转换为 libsql VECTOR 格式
 */
export function embeddingToVector(embedding: number[]): string {
  return JSON.stringify(embedding)
}

/**
 * libsql VECTOR 格式转换为向量数据
 */
export function vectorToEmbedding(vector: string | number[]): number[] {
  if (typeof vector === 'string') {
    return JSON.parse(vector)
  } else if (Array.isArray(vector)) {
    return vector
  }
  return []
}

/**
 * 验证项目名称
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '项目名称不能为空' }
  }

  if (name.length > 100) {
    return { valid: false, error: '项目名称不能超过100个字符' }
  }

  // 检查特殊字符
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(name)) {
    return { valid: false, error: '项目名称包含无效字符' }
  }

  return { valid: true }
}

/**
 * 验证文件名
 */
export function validateFileName(filename: string): { valid: boolean; error?: string } {
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: '文件名不能为空' }
  }

  // 检查文件扩展名
  const allowedExtensions = ['.txt', '.md']
  const hasValidExtension = allowedExtensions.some((ext) => filename.toLowerCase().endsWith(ext))

  if (!hasValidExtension) {
    return { valid: false, error: '仅支持 .txt 和 .md 文件格式' }
  }

  // 检查特殊字符
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(filename)) {
    return { valid: false, error: '文件名包含无效字符' }
  }

  return { valid: true }
}

/**
 * 计算文件哈希值 (使用 crypto)
 */
export function calculateFileHash(content: string): string {
  return createHash('md5').update(content).digest('hex')
}

/**
 * 分页查询辅助函数
 */
export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export function buildPaginationQuery(
  baseQuery: string,
  options: PaginationOptions = {}
): { query: string; offset: number; limit: number } {
  const page = Math.max(1, options.page || 1)
  const limit = Math.min(100, Math.max(1, options.limit || 20))
  const offset = (page - 1) * limit

  let query = baseQuery

  // 添加排序
  if (options.sortBy) {
    const sortOrder = options.sortOrder || 'DESC'
    query += ` ORDER BY ${options.sortBy} ${sortOrder}`
  }

  // 添加分页
  query += ` LIMIT ${limit} OFFSET ${offset}`

  return { query, offset, limit }
}

/**
 * 搜索查询构建器 (适配 libsql FTS5)
 */
export function buildSearchQuery(
  searchTerm: string,
  options: {
    tables?: string[]
    fields?: string[]
    fuzzy?: boolean
  } = {}
): string {
  if (!searchTerm.trim()) {
    return ''
  }

  // 清理搜索词
  const cleanTerm = searchTerm.replace(/['"]/g, '').trim()

  // 构建 FTS5 查询
  if (options.fuzzy) {
    return `"${cleanTerm}"*`
  } else {
    return `"${cleanTerm}"`
  }
}

/**
 * 向量相似度计算辅助函数
 */
export function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i]
    normA += vectorA[i] * vectorA[i]
    normB += vectorB[i] * vectorB[i]
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * 错误处理辅助函数
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * 包装数据库操作，提供统一的错误处理
 */
export async function wrapDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorContext: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`Database operation failed [${errorContext}]:`, error)

    if (error instanceof Error) {
      throw new DatabaseError(`${errorContext}: ${error.message}`, 'DATABASE_OPERATION_FAILED', {
        originalError: error
      })
    }

    throw new DatabaseError(`${errorContext}: Unknown error`, 'DATABASE_OPERATION_FAILED', {
      originalError: error
    })
  }
}

/**
 * libsql 批量操作辅助函数
 */
export function createBatchStatements(
  sql: string,
  dataArray: unknown[]
): Array<{ sql: string; args: unknown[] }> {
  return dataArray.map((data) => ({
    sql,
    args: Array.isArray(data) ? data : [data]
  }))
}

/**
 * libsql 向量查询构建器
 */
export function buildVectorSearchQuery(
  tableName: string,
  vectorColumn: string,
  queryVector: number[],
  options: {
    limit?: number
    threshold?: number
    projectId?: string
    additionalFilters?: string[]
  } = {}
): { sql: string; args: unknown[] } {
  const { limit = 10, threshold, projectId, additionalFilters = [] } = options

  let sql = `
    SELECT *, vector_distance(${vectorColumn}, vector(?)) as distance
    FROM ${tableName}
    WHERE ${vectorColumn} IS NOT NULL
  `

  const args: unknown[] = [JSON.stringify(queryVector)]

  // 添加阈值过滤
  if (threshold !== undefined) {
    sql += ' AND vector_distance(${vectorColumn}, vector(?)) <= ?'
    args.push(JSON.stringify(queryVector), threshold)
  }

  // 添加项目过滤
  if (projectId) {
    sql += ' AND project_id = ?'
    args.push(projectId)
  }

  // 添加额外过滤条件
  additionalFilters.forEach((filter) => {
    sql += ` AND ${filter}`
  })

  sql += ' ORDER BY distance ASC LIMIT ?'
  args.push(limit)

  return { sql, args }
}

import { executeQuery } from '../database/index'
import { generateEmbedding, queryVectorSimilarity } from './embedding'
import type { SearchResult } from '../../shared/types/file'
import type { EmbeddingConfig } from '../../shared/types/ai'

/**
 * Search Service
 *
 * Provides comprehensive search functionality across project files and conversations.
 * Supports both vector-based RAG search and traditional full-text search.
 * Handles search index management and result ranking.
 */

// Search configuration constants
const DEFAULT_SEARCH_LIMIT = 10
const DEFAULT_SIMILARITY_THRESHOLD = 0.7
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 1000

// Search result ranking weights
const RANKING_WEIGHTS = {
  similarity: 0.6, // Vector similarity score weight
  textMatch: 0.3, // Full-text search score weight
  recency: 0.1 // Recency boost weight
}

/**
 * Enhanced search result with additional metadata
 */
export interface EnhancedSearchResult extends SearchResult {
  projectId?: string
  projectName?: string
  chunkIndex?: number
  contextBefore?: string
  contextAfter?: string
  lastModified?: string
  relevanceScore?: number
}

/**
 * Search options for customizing search behavior
 */
export interface SearchOptions {
  limit?: number
  similarityThreshold?: number
  includeContext?: boolean
  projectId?: string
  fileTypes?: string[]
  sortBy?: 'similarity' | 'relevance' | 'date'
  dateRange?: {
    start?: string
    end?: string
  }
}

/**
 * Search project files using RAG vector similarity
 * @param query Search query text
 * @param projectId Project ID to search within
 * @param embeddingConfig Embedding model configuration
 * @param options Search options
 * @returns Array of search results with similarity scores
 */
export async function searchProjectFiles(
  query: string,
  projectId: string,
  embeddingConfig: EmbeddingConfig,
  options: SearchOptions = {}
): Promise<EnhancedSearchResult[]> {
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    throw new Error(`Query must be at least ${MIN_QUERY_LENGTH} characters long`)
  }

  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`Query must be less than ${MAX_QUERY_LENGTH} characters long`)
  }

  console.log(`[SEARCH] Searching project ${projectId} for: "${query}"`)

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query, embeddingConfig)

    // Perform vector similarity search
    const vectorResults = await queryVectorSimilarity(
      queryEmbedding,
      projectId,
      options.limit || DEFAULT_SEARCH_LIMIT,
      options.similarityThreshold || DEFAULT_SIMILARITY_THRESHOLD
    )

    // Enhance results with additional metadata and context
    const enhancedResults = await Promise.all(
      vectorResults.map((result) => enhanceSearchResult(result, query, options))
    )

    // Apply additional filtering if specified
    let filteredResults = enhancedResults

    if (options.fileTypes && options.fileTypes.length > 0) {
      filteredResults = filteredResults.filter((result) => {
        const fileExtension = result.filename.toLowerCase().split('.').pop()
        return fileExtension && options.fileTypes!.includes(`.${fileExtension}`)
      })
    }

    if (options.dateRange) {
      filteredResults = filteredResults.filter((result) => {
        if (!result.lastModified) return true

        const resultDate = new Date(result.lastModified)
        const startDate = options.dateRange!.start ? new Date(options.dateRange!.start) : null
        const endDate = options.dateRange!.end ? new Date(options.dateRange!.end) : null

        if (startDate && resultDate < startDate) return false
        if (endDate && resultDate > endDate) return false

        return true
      })
    }

    // Sort results based on specified criteria
    filteredResults = sortSearchResults(filteredResults, options.sortBy || 'similarity')

    console.log(`[SEARCH] Found ${filteredResults.length} results for project search`)
    return filteredResults
  } catch (error) {
    console.error('[SEARCH] Project file search failed:', error)
    throw new Error(
      `Project search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Build or rebuild search index for a project
 * @param projectId Project ID to build index for
 * @param embeddingConfig Embedding model configuration
 * @returns Statistics about the indexing process
 */
export async function buildSearchIndex(
  projectId: string,
  embeddingConfig: EmbeddingConfig
): Promise<{
  filesProcessed: number
  chunksIndexed: number
  timeElapsed: number
}> {
  console.log(`[SEARCH] Building search index for project ${projectId}`)
  const startTime = Date.now()

  try {
    // Get all ready files in the project
    const filesResult = await executeQuery(
      `
      SELECT id, filename, chunk_count
      FROM project_files
      WHERE project_id = ? AND status = 'ready'
      ORDER BY created_at ASC
    `,
      [projectId]
    )

    const files = filesResult.rows as Array<{
      id: string
      filename: string
      chunk_count: number
    }>

    if (files.length === 0) {
      console.log(`[SEARCH] No files to index for project ${projectId}`)
      return {
        filesProcessed: 0,
        chunksIndexed: 0,
        timeElapsed: Date.now() - startTime
      }
    }

    let totalChunksIndexed = 0

    // Process each file
    for (const file of files) {
      try {
        // Check if file already has embeddings
        const existingVectorsResult = await executeQuery(
          'SELECT COUNT(*) as count FROM project_vectors WHERE file_id = ?',
          [file.id]
        )

        const existingCount = (existingVectorsResult.rows[0] as { count: number }).count || 0

        if (existingCount > 0) {
          console.log(`[SEARCH] File ${file.filename} already indexed (${existingCount} vectors)`)
          totalChunksIndexed += existingCount
          continue
        }

        // Get file chunks that need indexing
        const chunksResult = await executeQuery(
          `
          SELECT id, content, chunk_index, metadata
          FROM file_chunks
          WHERE file_id = ?
          ORDER BY chunk_index ASC
        `,
          [file.id]
        )

        const chunks = chunksResult.rows as Array<{
          id: string
          content: string
          chunk_index: number
          metadata: string | null
        }>

        if (chunks.length === 0) {
          console.warn(`[SEARCH] No chunks found for file ${file.filename}`)
          continue
        }

        // Generate embeddings for all chunks
        const texts = chunks.map((chunk) => chunk.content)
        const { generateEmbeddings } = await import('./embedding')
        const embeddings = await generateEmbeddings(texts, embeddingConfig)

        // Insert vectors into database
        const vectorData = chunks.map((chunk, index) => ({
          fileId: file.id,
          chunkIndex: chunk.chunk_index,
          chunkText: chunk.content,
          embedding: embeddings[index],
          metadata: chunk.metadata ? JSON.parse(chunk.metadata) : undefined
        }))

        const { batchInsertVectors } = await import('./embedding')
        const insertedCount = await batchInsertVectors(vectorData)
        totalChunksIndexed += insertedCount

        console.log(`[SEARCH] Indexed ${insertedCount} chunks for file ${file.filename}`)
      } catch (error) {
        console.error(`[SEARCH] Failed to index file ${file.filename}:`, error)
        // Continue with other files even if one fails
      }
    }

    const timeElapsed = Date.now() - startTime
    console.log(`[SEARCH] Index building completed for project ${projectId}`)
    console.log(
      `[SEARCH] Processed ${files.length} files, indexed ${totalChunksIndexed} chunks in ${timeElapsed}ms`
    )

    return {
      filesProcessed: files.length,
      chunksIndexed: totalChunksIndexed,
      timeElapsed
    }
  } catch (error) {
    console.error(`[SEARCH] Failed to build search index for project ${projectId}:`, error)
    throw new Error(
      `Search index building failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Perform global search across all conversations and projects
 * @param query Search query text
 * @param options Search options
 * @returns Array of search results from conversations and files
 */
export async function searchGlobal(
  query: string,
  options: SearchOptions = {}
): Promise<{
  conversations: Array<{
    messageId: string
    content: string
    conversationTitle: string
    projectName?: string
    similarity: number
    metadata?: Record<string, unknown>
  }>
  files: EnhancedSearchResult[]
}> {
  if (!query || query.trim().length < MIN_QUERY_LENGTH) {
    throw new Error(`Query must be at least ${MIN_QUERY_LENGTH} characters long`)
  }

  console.log(`[SEARCH] Performing global search for: "${query}"`)

  try {
    // Search conversations using full-text search
    const conversationResults = await searchConversations(query, options)

    // Search files using vector similarity (if embedding config is available)
    const fileResults: EnhancedSearchResult[] = []

    // For global file search, we would need to iterate through all projects
    // For now, we'll return empty file results as this requires embedding config
    // In a real implementation, this would use a global embedding service

    console.log(
      `[SEARCH] Global search completed: ${conversationResults.length} conversation results, ${fileResults.length} file results`
    )

    return {
      conversations: conversationResults,
      files: fileResults
    }
  } catch (error) {
    console.error('[SEARCH] Global search failed:', error)
    throw new Error(
      `Global search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Search conversations using full-text search
 * @param query Search query text
 * @param options Search options
 * @returns Array of conversation search results
 */
async function searchConversations(
  query: string,
  options: SearchOptions = {}
): Promise<
  Array<{
    messageId: string
    content: string
    conversationTitle: string
    projectName?: string
    similarity: number
    metadata?: Record<string, unknown>
  }>
> {
  try {
    // Use FTS5 full-text search if available, otherwise fall back to LIKE search
    let sql = `
      SELECT 
        m.id as message_id,
        m.content,
        c.title as conversation_title,
        p.name as project_name,
        m.created_at
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE m.content LIKE ?
    `

    const params: unknown[] = [`%${query}%`]

    // Add project filter if specified
    if (options.projectId) {
      sql += ' AND c.project_id = ?'
      params.push(options.projectId)
    }

    // Add date range filter if specified
    if (options.dateRange) {
      if (options.dateRange.start) {
        sql += ' AND m.created_at >= ?'
        params.push(options.dateRange.start)
      }
      if (options.dateRange.end) {
        sql += ' AND m.created_at <= ?'
        params.push(options.dateRange.end)
      }
    }

    // Add ordering and limit
    sql += ' ORDER BY m.created_at DESC LIMIT ?'
    params.push(options.limit || DEFAULT_SEARCH_LIMIT)

    const result = await executeQuery(sql, params)

    // Convert results and calculate basic similarity scores
    return result.rows.map((row: Record<string, unknown>) => {
      const content = typeof row.content === 'string' ? row.content : JSON.stringify(row.content)
      const queryLower = query.toLowerCase()
      const contentLower = content.toLowerCase()

      // Simple similarity calculation based on query term frequency
      const queryTerms = queryLower.split(/\s+/)
      const matchCount = queryTerms.reduce((count, term) => {
        return count + (contentLower.includes(term) ? 1 : 0)
      }, 0)

      const similarity = matchCount / queryTerms.length

      return {
        messageId: row.message_id as string,
        content: content.substring(0, 500), // Truncate for preview
        conversationTitle: row.conversation_title as string,
        projectName: (row.project_name as string) || undefined,
        similarity,
        metadata: {
          createdAt: row.created_at as string,
          fullContent: content
        }
      }
    })
  } catch (error) {
    console.error('[SEARCH] Conversation search failed:', error)
    throw new Error(
      `Conversation search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Enhance search result with additional metadata and context
 * @param result Basic search result
 * @param query Original search query
 * @param options Search options
 * @returns Enhanced search result
 */
async function enhanceSearchResult(
  result: SearchResult,
  query: string,
  options: SearchOptions
): Promise<EnhancedSearchResult> {
  try {
    // Get additional file and project information
    const fileInfoResult = await executeQuery(
      `
      SELECT 
        pf.project_id,
        pf.updated_at,
        p.name as project_name
      FROM project_files pf
      LEFT JOIN projects p ON pf.project_id = p.id
      WHERE pf.id = ?
    `,
      [result.fileId]
    )

    const fileInfo = fileInfoResult.rows[0] as {
      project_id?: string
      project_name?: string
      updated_at?: string
    }

    const enhanced: EnhancedSearchResult = {
      ...result,
      projectId: fileInfo?.project_id,
      projectName: fileInfo?.project_name,
      lastModified: fileInfo?.updated_at,
      relevanceScore: calculateRelevanceScore(result, query)
    }

    // Add context if requested
    if (options.includeContext) {
      const context = await getSearchResultContext(
        result.fileId,
        result.metadata?.chunkIndex as number
      )
      enhanced.contextBefore = context.before
      enhanced.contextAfter = context.after
    }

    return enhanced
  } catch (error) {
    console.warn('[SEARCH] Failed to enhance search result:', error)
    // Return basic result if enhancement fails
    return {
      ...result,
      relevanceScore: result.similarity
    }
  }
}

/**
 * Get context around a search result chunk
 * @param fileId File ID
 * @param chunkIndex Index of the matching chunk
 * @returns Context before and after the chunk
 */
async function getSearchResultContext(
  fileId: string,
  chunkIndex: number
): Promise<{ before?: string; after?: string }> {
  try {
    // Get surrounding chunks for context
    const contextResult = await executeQuery(
      `
      SELECT chunk_index, content
      FROM file_chunks
      WHERE file_id = ? AND chunk_index BETWEEN ? AND ?
      ORDER BY chunk_index ASC
    `,
      [fileId, Math.max(0, chunkIndex - 1), chunkIndex + 1]
    )

    const chunks = contextResult.rows as Array<{
      chunk_index: number
      content: string
    }>

    const context: { before?: string; after?: string } = {}

    for (const chunk of chunks) {
      if (chunk.chunk_index === chunkIndex - 1) {
        context.before = chunk.content.substring(-200) // Last 200 chars
      } else if (chunk.chunk_index === chunkIndex + 1) {
        context.after = chunk.content.substring(0, 200) // First 200 chars
      }
    }

    return context
  } catch (error) {
    console.warn('[SEARCH] Failed to get search result context:', error)
    return {}
  }
}

/**
 * Calculate relevance score combining multiple factors
 * @param result Search result
 * @param query Original search query
 * @returns Relevance score (0-1)
 */
function calculateRelevanceScore(result: SearchResult, query: string): number {
  // Start with similarity score
  let score = result.similarity * RANKING_WEIGHTS.similarity

  // Add text matching score
  const queryLower = query.toLowerCase()
  const contentLower = result.content.toLowerCase()
  const textMatchScore = contentLower.includes(queryLower) ? 1 : 0
  score += textMatchScore * RANKING_WEIGHTS.textMatch

  // Add recency boost if metadata contains timestamp
  if (result.metadata?.createdAt) {
    const createdAt = new Date(result.metadata.createdAt as string)
    const now = new Date()
    const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.max(0, 1 - daysSinceCreation / 365) // Decay over a year
    score += recencyScore * RANKING_WEIGHTS.recency
  }

  return Math.min(1, score) // Cap at 1.0
}

/**
 * Sort search results based on specified criteria
 * @param results Array of search results
 * @param sortBy Sort criteria
 * @returns Sorted array of search results
 */
function sortSearchResults(
  results: EnhancedSearchResult[],
  sortBy: 'similarity' | 'relevance' | 'date'
): EnhancedSearchResult[] {
  return results.sort((a, b) => {
    switch (sortBy) {
      case 'similarity':
        return b.similarity - a.similarity

      case 'relevance':
        return (b.relevanceScore || 0) - (a.relevanceScore || 0)

      case 'date': {
        const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0
        const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0
        return dateB - dateA
      }

      default:
        return b.similarity - a.similarity
    }
  })
}

/**
 * Get search statistics for a project
 * @param projectId Project ID
 * @returns Search statistics
 */
export async function getSearchStats(projectId: string): Promise<{
  totalFiles: number
  indexedFiles: number
  totalChunks: number
  indexedChunks: number
  lastIndexUpdate: string | null
}> {
  try {
    const result = await executeQuery(
      `
      SELECT 
        COUNT(DISTINCT pf.id) as total_files,
        COUNT(DISTINCT pv.file_id) as indexed_files,
        SUM(pf.chunk_count) as total_chunks,
        COUNT(pv.id) as indexed_chunks,
        MAX(pf.updated_at) as last_index_update
      FROM project_files pf
      LEFT JOIN project_vectors pv ON pf.id = pv.file_id
      WHERE pf.project_id = ?
    `,
      [projectId]
    )

    const row = result.rows[0] as {
      total_files: number
      indexed_files: number
      total_chunks: number
      indexed_chunks: number
      last_index_update: string | null
    }

    return {
      totalFiles: row.total_files || 0,
      indexedFiles: row.indexed_files || 0,
      totalChunks: row.total_chunks || 0,
      indexedChunks: row.indexed_chunks || 0,
      lastIndexUpdate: row.last_index_update || null
    }
  } catch (error) {
    console.error(`[SEARCH] Failed to get search stats for project ${projectId}:`, error)
    throw new Error(
      `Failed to get search statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

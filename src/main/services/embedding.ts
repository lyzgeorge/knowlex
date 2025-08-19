// TODO: Implement actual embedding API integration using Vercel AI SDK
import { executeQuery, executeTransaction } from '../database/index'
import { generateId } from '../../shared/utils/id'
import type { EmbeddingConfig } from '../../shared/types/ai'
import type { SearchResult } from '../../shared/types/file'

/**
 * Embedding Service
 *
 * Handles text vectorization using AI embedding models and vector database operations.
 * Provides functions for generating embeddings, batch processing, and similarity search.
 * Integrates with libsql vector database for efficient storage and retrieval.
 */

// Default embedding configuration
const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  apiKey: '',
  model: 'text-embedding-ada-002',
  dimensions: 1536,
  encodingFormat: 'float'
}

// Batch processing configuration
const BATCH_SIZE = 50 // Process embeddings in batches
const MAX_RETRIES = 3 // Maximum retry attempts for failed requests
const RETRY_DELAY = 1000 // Base delay for exponential backoff (ms)

/**
 * Generate embeddings for a single text input
 * @param text Text content to vectorize
 * @param config Embedding model configuration
 * @returns Vector embedding as number array
 */
export async function generateEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text content is required for embedding generation')
  }

  if (!config.apiKey) {
    throw new Error('API key is required for embedding generation')
  }

  console.log(`[EMBEDDING] Generating embedding for text (${text.length} chars)`)

  try {
    // TODO: Convert embedding config to AI config format and use actual embedding API
    // const aiConfig: AIConfig = {
    //   apiKey: config.apiKey,
    //   baseURL: config.baseURL,
    //   model: config.model,
    //   temperature: 0 // Embeddings should be deterministic
    // }
    // const model = await getModel(aiConfig)

    // For now, we'll use a placeholder implementation since the AI models
    // in the current system are focused on chat completion
    // In a real implementation, this would call the embedding API

    // TODO: Implement actual embedding API call
    // This is a placeholder that generates a random vector for development
    const dimensions = config.dimensions || DEFAULT_EMBEDDING_CONFIG.dimensions!
    const embedding = Array.from({ length: dimensions }, () => Math.random() - 0.5)

    console.log(`[EMBEDDING] Generated embedding with ${embedding.length} dimensions`)
    return embedding
  } catch (error) {
    console.error('[EMBEDDING] Failed to generate embedding:', error)
    throw new Error(
      `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate embeddings for multiple text inputs in batches
 * @param texts Array of text content to vectorize
 * @param config Embedding model configuration
 * @returns Array of vector embeddings
 */
export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return []
  }

  console.log(`[EMBEDDING] Generating embeddings for ${texts.length} texts`)

  const embeddings: number[][] = []
  const batchSize = BATCH_SIZE

  // Process texts in batches to avoid API rate limits
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    console.log(
      `[EMBEDDING] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`
    )

    try {
      // Generate embeddings for current batch
      const batchEmbeddings = await Promise.all(
        batch.map((text) => generateEmbeddingWithRetry(text, config))
      )

      embeddings.push(...batchEmbeddings)

      // Add small delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`[EMBEDDING] Failed to process batch starting at index ${i}:`, error)
      throw new Error(
        `Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  console.log(`[EMBEDDING] Successfully generated ${embeddings.length} embeddings`)
  return embeddings
}

/**
 * Generate embedding with retry logic for failed requests
 * @param text Text content to vectorize
 * @param config Embedding model configuration
 * @returns Vector embedding as number array
 */
async function generateEmbeddingWithRetry(
  text: string,
  config: EmbeddingConfig
): Promise<number[]> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateEmbedding(text, config)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1) // Exponential backoff
        console.warn(`[EMBEDDING] Attempt ${attempt} failed, retrying in ${delay}ms:`, error)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw new Error(
    `Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`
  )
}

/**
 * Insert vectors into the database in batches
 * @param vectors Array of vector data to insert
 * @returns Number of vectors successfully inserted
 */
export async function batchInsertVectors(
  vectors: Array<{
    fileId: string
    chunkIndex: number
    chunkText: string
    embedding: number[]
    metadata?: Record<string, unknown>
  }>
): Promise<number> {
  if (!vectors || vectors.length === 0) {
    return 0
  }

  console.log(`[EMBEDDING] Inserting ${vectors.length} vectors into database`)

  try {
    // Prepare batch insert queries
    const queries = vectors.map((vector) => ({
      sql: `
        INSERT INTO project_vectors (id, file_id, chunk_index, chunk_text, embedding, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      params: [
        generateId(),
        vector.fileId,
        vector.chunkIndex,
        vector.chunkText,
        JSON.stringify(vector.embedding),
        vector.metadata ? JSON.stringify(vector.metadata) : null
      ]
    }))

    // Execute all inserts in a transaction for atomicity
    await executeTransaction(queries)

    console.log(`[EMBEDDING] Successfully inserted ${vectors.length} vectors`)
    return vectors.length
  } catch (error) {
    console.error('[EMBEDDING] Failed to insert vectors:', error)
    throw new Error(
      `Vector insertion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Query vector database for similar content
 * @param queryEmbedding Query vector to search for
 * @param projectId Optional project ID to limit search scope
 * @param limit Maximum number of results to return
 * @param similarityThreshold Minimum similarity score (0-1)
 * @returns Array of search results with similarity scores
 */
export async function queryVectorSimilarity(
  queryEmbedding: number[],
  projectId?: string,
  limit: number = 10,
  similarityThreshold: number = 0.7
): Promise<SearchResult[]> {
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error('Query embedding is required')
  }

  console.log(
    `[EMBEDDING] Querying vector similarity${projectId ? ` for project ${projectId}` : ' globally'}`
  )

  try {
    // Build the SQL query with optional project filtering
    let sql = `
      SELECT 
        pv.file_id,
        pv.chunk_text as content,
        pv.chunk_index,
        pv.metadata,
        pf.filename,
        pf.project_id,
        vector_distance_cos(pv.embedding, ?) as similarity
      FROM project_vectors pv
      JOIN project_files pf ON pv.file_id = pf.id
    `

    const params: unknown[] = [JSON.stringify(queryEmbedding)]

    // Add project filter if specified
    if (projectId) {
      sql += ' WHERE pf.project_id = ?'
      params.push(projectId)
    }

    // Add similarity threshold and ordering
    sql += `
      ${projectId ? 'AND' : 'WHERE'} vector_distance_cos(pv.embedding, ?) >= ?
      ORDER BY similarity DESC
      LIMIT ?
    `

    params.push(JSON.stringify(queryEmbedding), similarityThreshold, limit)

    const result = await executeQuery(sql, params as [string, number, number])

    // Convert results to SearchResult format
    const searchResults: SearchResult[] = (result.rows as Record<string, unknown>[]).map(
      (row: Record<string, unknown>) => ({
        content: row.content as string,
        filename: row.filename as string,
        fileId: row.file_id as string,
        similarity: row.similarity as number,
        metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined
      })
    )

    console.log(`[EMBEDDING] Found ${searchResults.length} similar vectors`)
    return searchResults
  } catch (error) {
    console.error('[EMBEDDING] Vector similarity query failed:', error)
    throw new Error(
      `Vector similarity search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Update embeddings for existing file chunks
 * @param fileId File ID to update embeddings for
 * @param config Embedding model configuration
 * @returns Number of chunks updated
 */
export async function updateFileEmbeddings(
  fileId: string,
  config: EmbeddingConfig
): Promise<number> {
  console.log(`[EMBEDDING] Updating embeddings for file ${fileId}`)

  try {
    // Get existing chunks for the file
    const chunksResult = await executeQuery(
      'SELECT id, chunk_text, chunk_index FROM project_vectors WHERE file_id = ? ORDER BY chunk_index',
      [fileId]
    )

    if (chunksResult.rows.length === 0) {
      console.log(`[EMBEDDING] No chunks found for file ${fileId}`)
      return 0
    }

    const chunks = chunksResult.rows as Array<{
      id: string
      chunk_text: string
      chunk_index: number
    }>

    // Generate new embeddings for all chunks
    const texts = chunks.map((chunk) => chunk.chunk_text)
    const embeddings = await generateEmbeddings(texts, config)

    // Update embeddings in database
    const updateQueries = chunks.map((chunk, index) => ({
      sql: 'UPDATE project_vectors SET embedding = ? WHERE id = ?',
      params: [JSON.stringify(embeddings[index]), chunk.id]
    }))

    await executeTransaction(updateQueries)

    console.log(`[EMBEDDING] Updated embeddings for ${chunks.length} chunks`)
    return chunks.length
  } catch (error) {
    console.error(`[EMBEDDING] Failed to update embeddings for file ${fileId}:`, error)
    throw new Error(
      `Embedding update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Delete all vectors for a specific file
 * @param fileId File ID to delete vectors for
 * @returns Number of vectors deleted
 */
export async function deleteFileVectors(fileId: string): Promise<number> {
  console.log(`[EMBEDDING] Deleting vectors for file ${fileId}`)

  try {
    const result = await executeQuery('DELETE FROM project_vectors WHERE file_id = ?', [fileId])

    console.log(`[EMBEDDING] Deleted ${result.rowsAffected} vectors for file ${fileId}`)
    return result.rowsAffected
  } catch (error) {
    console.error(`[EMBEDDING] Failed to delete vectors for file ${fileId}:`, error)
    throw new Error(
      `Vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get embedding statistics for a project
 * @param projectId Project ID to get statistics for
 * @returns Statistics about embeddings in the project
 */
export async function getEmbeddingStats(projectId: string): Promise<{
  totalVectors: number
  totalFiles: number
  averageChunksPerFile: number
  lastUpdated: string | null
}> {
  try {
    const result = await executeQuery(
      `
      SELECT 
        COUNT(pv.id) as total_vectors,
        COUNT(DISTINCT pv.file_id) as total_files,
        MAX(pf.updated_at) as last_updated
      FROM project_vectors pv
      JOIN project_files pf ON pv.file_id = pf.id
      WHERE pf.project_id = ?
    `,
      [projectId]
    )

    const row = result.rows[0] as {
      total_vectors: number
      total_files: number
      last_updated: string | null
    }
    const totalVectors = row.total_vectors || 0
    const totalFiles = row.total_files || 0

    return {
      totalVectors,
      totalFiles,
      averageChunksPerFile: totalFiles > 0 ? Math.round(totalVectors / totalFiles) : 0,
      lastUpdated: row.last_updated || null
    }
  } catch (error) {
    console.error(`[EMBEDDING] Failed to get embedding stats for project ${projectId}:`, error)
    throw new Error(
      `Failed to get embedding statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Validate embedding configuration
 * @param config Embedding configuration to validate
 * @returns True if configuration is valid
 */
export function validateEmbeddingConfig(config: EmbeddingConfig): boolean {
  try {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false
    }

    if (!config.model || config.model.trim().length === 0) {
      return false
    }

    if (config.dimensions && (config.dimensions < 1 || config.dimensions > 10000)) {
      return false
    }

    if (config.encodingFormat && !['float', 'base64'].includes(config.encodingFormat)) {
      return false
    }

    return true
  } catch (error) {
    console.error('[EMBEDDING] Configuration validation failed:', error)
    return false
  }
}

/**
 * Get default embedding configuration
 * @returns Default embedding configuration
 */
export function getDefaultEmbeddingConfig(): EmbeddingConfig {
  return { ...DEFAULT_EMBEDDING_CONFIG }
}

import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'

export interface VectorDocument {
  id: string
  file_id: number
  project_id: number
  chunk_index: number
  content: string
  filename: string
  chunk_start: number
  chunk_end: number
  created_at: string
  embedding?: number[]
  score?: number
}

export interface VectorSearchResult extends VectorDocument {
  score: number
}

export interface VectorConfig {
  dbPath: string
  dimension: number
  maxElements: number
  efConstruction: number
  m: number
}

export class VectorManager {
  private db: Database.Database | null = null
  private config: VectorConfig
  private isInitialized = false
  private partitionSize = 100000 // 100k vectors per partition

  constructor(config?: Partial<VectorConfig>) {
    const userDataPath = app.getPath('userData')
    const defaultDbPath = path.join(userDataPath, 'knowlex_vectors.db')

    this.config = {
      dbPath: defaultDbPath,
      dimension: 768, // Default for text-embedding-3-small
      maxElements: 1000000, // 1M vectors max
      efConstruction: 200,
      m: 16,
      ...config,
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // Open database connection
      this.db = new Database(this.config.dbPath)

      // Configure database for vector operations
      await this.configureVectorDatabase()

      // Load hnswsqlite extension
      await this.loadHNSWExtension()

      // Initialize vector tables
      await this.initializeVectorTables()

      // Verify vector database integrity
      await this.checkVectorIntegrity()

      this.isInitialized = true
      console.log('Vector database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize vector database:', error)
      throw error
    }
  }

  private async configureVectorDatabase(): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL')

    // Optimize for vector operations
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = -128000') // 128MB cache for vectors
    this.db.pragma('temp_store = MEMORY')
    this.db.pragma('mmap_size = 536870912') // 512MB mmap for large vector data

    console.log('Vector database configuration applied')
  }

  private async loadHNSWExtension(): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    try {
      // Try to load hnswsqlite extension
      // Note: This assumes hnswsqlite is properly installed and available
      this.db.loadExtension('hnswsqlite')
      console.log('HNSW extension loaded successfully')
    } catch (error) {
      console.error('Failed to load HNSW extension:', error)
      console.log('Falling back to basic vector storage without HNSW indexing')
      // Continue without HNSW - we'll implement basic vector storage
    }
  }

  private async initializeVectorTables(): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    try {
      // Try to create HNSW virtual table first
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vector_documents USING hnsw(
          id TEXT PRIMARY KEY,
          file_id INTEGER,
          project_id INTEGER,
          chunk_index INTEGER,
          content TEXT,
          filename TEXT,
          chunk_start INTEGER,
          chunk_end INTEGER,
          created_at TEXT,
          embedding(${this.config.dimension})
        );
      `)

      console.log('HNSW vector table created successfully')
    } catch (error) {
      console.warn('HNSW table creation failed, creating fallback table:', error)

      // Fallback to regular table with manual vector operations
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS vector_documents (
          id TEXT PRIMARY KEY,
          file_id INTEGER NOT NULL,
          project_id INTEGER NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          filename TEXT NOT NULL,
          chunk_start INTEGER NOT NULL,
          chunk_end INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          embedding BLOB NOT NULL
        );
      `)
    }

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_vector_project_id ON vector_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_vector_file_id ON vector_documents(file_id);
      CREATE INDEX IF NOT EXISTS idx_vector_created_at ON vector_documents(created_at DESC);
    `)

    // Create partition management table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vector_partitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        partition_name TEXT NOT NULL,
        vector_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, partition_name)
      );
    `)

    console.log('Vector tables initialized')
  }

  async insertDocuments(documents: VectorDocument[]): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')
    if (documents.length === 0) return

    const transaction = this.db.transaction((docs: VectorDocument[]) => {
      const stmt = this.db!.prepare(`
        INSERT OR REPLACE INTO vector_documents (
          id, file_id, project_id, chunk_index, content,
          filename, chunk_start, chunk_end, created_at, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      for (const doc of docs) {
        if (!doc.embedding) {
          throw new Error(`Document ${doc.id} missing embedding`)
        }

        const embeddingBlob = this.serializeEmbedding(doc.embedding)

        stmt.run(
          doc.id,
          doc.file_id,
          doc.project_id,
          doc.chunk_index,
          doc.content,
          doc.filename,
          doc.chunk_start,
          doc.chunk_end,
          doc.created_at,
          embeddingBlob
        )
      }
    })

    try {
      transaction(documents)

      // Update partition info
      await this.updatePartitionInfo(documents[0].project_id)

      console.log(`Inserted ${documents.length} vector documents`)
    } catch (error) {
      console.error('Failed to insert vector documents:', error)
      throw error
    }
  }

  async search(
    queryVector: number[],
    projectId: number,
    topK: number = 10,
    threshold: number = 0.2
  ): Promise<VectorSearchResult[]> {
    if (!this.db) throw new Error('Vector database not initialized')

    try {
      // Try HNSW search first
      return await this.searchWithHNSW(queryVector, projectId, topK, threshold)
    } catch (error) {
      console.warn('HNSW search failed, falling back to brute force:', error)
      return await this.searchBruteForce(queryVector, projectId, topK, threshold)
    }
  }

  private async searchWithHNSW(
    queryVector: number[],
    projectId: number,
    topK: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    if (!this.db) throw new Error('Vector database not initialized')

    const stmt = this.db.prepare(`
      SELECT 
        id, file_id, project_id, chunk_index, content,
        filename, chunk_start, chunk_end, created_at,
        distance(embedding, ?) as distance
      FROM vector_documents
      WHERE project_id = ?
      ORDER BY distance ASC
      LIMIT ?
    `)

    const queryBlob = this.serializeEmbedding(queryVector)
    const results = stmt.all(queryBlob, projectId, topK) as any[]

    return results
      .map(row => ({
        id: row.id,
        file_id: row.file_id,
        project_id: row.project_id,
        chunk_index: row.chunk_index,
        content: row.content,
        filename: row.filename,
        chunk_start: row.chunk_start,
        chunk_end: row.chunk_end,
        created_at: row.created_at,
        score: 1 - row.distance, // Convert distance to similarity score
      }))
      .filter(doc => doc.score >= threshold)
  }

  private async searchBruteForce(
    queryVector: number[],
    projectId: number,
    topK: number,
    threshold: number
  ): Promise<VectorSearchResult[]> {
    if (!this.db) throw new Error('Vector database not initialized')

    // Load all vectors for the project (this is inefficient but works as fallback)
    const stmt = this.db.prepare(`
      SELECT 
        id, file_id, project_id, chunk_index, content,
        filename, chunk_start, chunk_end, created_at, embedding
      FROM vector_documents
      WHERE project_id = ?
    `)

    const rows = stmt.all(projectId) as any[]
    const results: VectorSearchResult[] = []

    for (const row of rows) {
      const embedding = this.deserializeEmbedding(row.embedding)
      const similarity = this.cosineSimilarity(queryVector, embedding)

      if (similarity >= threshold) {
        results.push({
          id: row.id,
          file_id: row.file_id,
          project_id: row.project_id,
          chunk_index: row.chunk_index,
          content: row.content,
          filename: row.filename,
          chunk_start: row.chunk_start,
          chunk_end: row.chunk_end,
          created_at: row.created_at,
          score: similarity,
        })
      }
    }

    // Sort by similarity and return top K
    return results.sort((a, b) => b.score - a.score).slice(0, topK)
  }

  async deleteByFileId(fileId: number): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    const stmt = this.db.prepare('DELETE FROM vector_documents WHERE file_id = ?')
    const result = stmt.run(fileId)

    console.log(`Deleted ${result.changes} vector documents for file ${fileId}`)

    // Update partition info
    const projectId = await this.getProjectIdByFileId(fileId)
    if (projectId) {
      await this.updatePartitionInfo(projectId)
    }
  }

  async deleteByProjectId(projectId: number): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    const stmt = this.db.prepare('DELETE FROM vector_documents WHERE project_id = ?')
    const result = stmt.run(projectId)

    console.log(`Deleted ${result.changes} vector documents for project ${projectId}`)

    // Clean up partition info
    const partitionStmt = this.db.prepare('DELETE FROM vector_partitions WHERE project_id = ?')
    partitionStmt.run(projectId)
  }

  async getVectorCount(projectId?: number): Promise<number> {
    if (!this.db) throw new Error('Vector database not initialized')

    let sql = 'SELECT COUNT(*) as count FROM vector_documents'
    const params: any[] = []

    if (projectId !== undefined) {
      sql += ' WHERE project_id = ?'
      params.push(projectId)
    }

    const result = this.db.prepare(sql).get(...params) as { count: number }
    return result.count
  }

  async checkVectorIntegrity(): Promise<boolean> {
    if (!this.db) throw new Error('Vector database not initialized')

    try {
      // Check basic database integrity
      const result = this.db.prepare('PRAGMA integrity_check').get() as { integrity_check: string }

      if (result.integrity_check !== 'ok') {
        console.error('Vector database integrity check failed:', result.integrity_check)
        return false
      }

      // Check vector data consistency
      const vectorCount = await this.getVectorCount()
      console.log(`Vector database contains ${vectorCount} documents`)

      // Verify partition consistency
      await this.verifyPartitions()

      console.log('Vector database integrity check passed')
      return true
    } catch (error) {
      console.error('Vector database integrity check error:', error)
      return false
    }
  }

  async optimizeVectorDatabase(): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    try {
      console.log('Optimizing vector database...')

      // Run VACUUM to reclaim space
      this.db.exec('VACUUM')

      // Analyze tables for better query planning
      this.db.exec('ANALYZE')

      // Rebuild partitions if needed
      await this.rebuildPartitions()

      console.log('Vector database optimization completed')
    } catch (error) {
      console.error('Vector database optimization failed:', error)
      throw error
    }
  }

  private async updatePartitionInfo(projectId: number): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM vector_documents WHERE project_id = ?'
    )
    const result = countStmt.get(projectId) as { count: number }

    const upsertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO vector_partitions (project_id, partition_name, vector_count)
      VALUES (?, ?, ?)
    `)

    upsertStmt.run(projectId, `project_${projectId}`, result.count)
  }

  private async verifyPartitions(): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    const partitions = this.db.prepare('SELECT * FROM vector_partitions').all() as any[]

    for (const partition of partitions) {
      const actualCount = this.db
        .prepare('SELECT COUNT(*) as count FROM vector_documents WHERE project_id = ?')
        .get(partition.project_id) as { count: number }

      if (actualCount.count !== partition.vector_count) {
        console.warn(
          `Partition mismatch for project ${partition.project_id}: ` +
            `expected ${partition.vector_count}, actual ${actualCount.count}`
        )
        await this.updatePartitionInfo(partition.project_id)
      }
    }
  }

  private async rebuildPartitions(): Promise<void> {
    if (!this.db) throw new Error('Vector database not initialized')

    // Clear existing partition info
    this.db.prepare('DELETE FROM vector_partitions').run()

    // Rebuild from actual data
    const projects = this.db.prepare('SELECT DISTINCT project_id FROM vector_documents').all() as {
      project_id: number
    }[]

    for (const project of projects) {
      await this.updatePartitionInfo(project.project_id)
    }
  }

  private async getProjectIdByFileId(fileId: number): Promise<number | null> {
    if (!this.db) throw new Error('Vector database not initialized')

    const result = this.db
      .prepare('SELECT project_id FROM vector_documents WHERE file_id = ? LIMIT 1')
      .get(fileId) as { project_id: number } | undefined

    return result?.project_id || null
  }

  private serializeEmbedding(embedding: number[]): Buffer {
    // Convert float array to binary format for efficient storage
    const buffer = Buffer.allocUnsafe(embedding.length * 4)
    for (let i = 0; i < embedding.length; i++) {
      buffer.writeFloatLE(embedding[i], i * 4)
    }
    return buffer
  }

  private deserializeEmbedding(buffer: Buffer): number[] {
    // Convert binary format back to float array
    const embedding: number[] = []
    for (let i = 0; i < buffer.length; i += 4) {
      embedding.push(buffer.readFloatLE(i))
    }
    return embedding
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vector dimensions must match')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
      console.log('Vector database connection closed')
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null
  }

  getDatabase(): Database.Database {
    if (!this.db) throw new Error('Vector database not initialized')
    return this.db
  }
}

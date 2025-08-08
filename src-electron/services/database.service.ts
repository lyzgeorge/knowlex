import { createClient, Client } from '@libsql/client'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export class DatabaseService {
  private static instance: DatabaseService
  private client: Client | null = null
  private readonly dbPath: string
  private readonly currentVersion = 1

  private constructor() {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')

    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'knowlex.db')
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public async initialize(): Promise<void> {
    try {
      // 初始化 libsql 客户端
      this.client = createClient({
        url: `file:${this.dbPath}`
      })

      // 启用 WAL 模式确保数据写入稳定性
      await this.client.execute('PRAGMA journal_mode = WAL')
      await this.client.execute('PRAGMA synchronous = NORMAL')
      await this.client.execute('PRAGMA cache_size = 1000')
      await this.client.execute('PRAGMA temp_store = memory')

      // 启用外键约束
      await this.client.execute('PRAGMA foreign_keys = ON')

      // 运行数据库迁移
      await this.runMigrations()

      console.log('libsql database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize libsql database:', error)
      throw error
    }
  }

  public getClient(): Client {
    if (!this.client) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.client
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close()
      this.client = null
    }
  }

  public async executeTransaction<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = this.getClient()

    try {
      await client.execute('BEGIN TRANSACTION')
      const result = await fn(client)
      await client.execute('COMMIT')
      return result
    } catch (error) {
      await client.execute('ROLLBACK')
      throw error
    }
  }

  private async runMigrations(): Promise<void> {
    const client = this.getClient()

    // 创建迁移表
    await client.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 获取当前数据库版本
    const result = await client.execute('SELECT MAX(version) as version FROM schema_migrations')
    const dbVersion = (result.rows[0]?.version as number) || 0

    // 运行需要的迁移
    for (let version = dbVersion + 1; version <= this.currentVersion; version++) {
      console.log(`Running migration ${version}`)
      await this.runMigration(version)

      // 记录迁移
      await client.execute({
        sql: 'INSERT INTO schema_migrations (version) VALUES (?)',
        args: [version]
      })
    }
  }

  private async runMigration(version: number): Promise<void> {
    const client = this.getClient()

    switch (version) {
      case 1:
        // 初始数据库结构
        await client.batch([
          // 项目表
          `CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,

          // 会话表
          `CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            title TEXT NOT NULL,
            summary TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
          )`,

          // 消息表
          `CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            metadata TEXT, -- JSON 格式存储额外信息
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
          )`,

          // 项目文件表
          `CREATE TABLE IF NOT EXISTS project_files (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_hash TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,

          // 文本块表 - 使用 TEXT 存储向量数据 (JSON格式)
          // Note: VECTOR type may not be available in all libsql versions
          `CREATE TABLE IF NOT EXISTS text_chunks (
            id TEXT PRIMARY KEY,
            file_id TEXT NOT NULL,
            content TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            embedding TEXT, -- JSON格式存储向量数据，384维 (OpenAI text-embedding-3-small)
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (file_id) REFERENCES project_files(id) ON DELETE CASCADE
          )`,

          // 项目记忆表
          `CREATE TABLE IF NOT EXISTS project_memories (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('user', 'system')),
            content TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,

          // 知识卡片表
          `CREATE TABLE IF NOT EXISTS knowledge_cards (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT, -- JSON 数组格式
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,

          // 应用设置表
          `CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL, -- JSON 格式
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`
        ])

        // 创建性能优化索引
        await client.batch([
          'CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)',
          'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)',
          'CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_project_files_hash ON project_files(file_hash)',
          'CREATE INDEX IF NOT EXISTS idx_text_chunks_file_id ON text_chunks(file_id)',
          'CREATE INDEX IF NOT EXISTS idx_project_memories_project_id ON project_memories(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_knowledge_cards_project_id ON knowledge_cards(project_id)'
        ])

        // 创建 libsql 原生向量索引
        await this.createVectorIndex('text_chunks', 'embedding')

        // 创建全文搜索索引 (FTS5) - 简化版本，不使用触发器
        try {
          await client.execute(`
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
              message_id UNINDEXED,
              conversation_id UNINDEXED,
              content
            )
          `)
          console.log('FTS5 table created successfully')
        } catch (ftsError) {
          console.warn('FTS5 table creation failed, continuing without full-text search:', ftsError)
        }

        // 创建更新时间触发器
        await client.batch([
          `CREATE TRIGGER IF NOT EXISTS update_projects_updated_at 
            AFTER UPDATE ON projects
          BEGIN
            UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END`,

          `CREATE TRIGGER IF NOT EXISTS update_conversations_updated_at 
            AFTER UPDATE ON conversations
          BEGIN
            UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END`,

          `CREATE TRIGGER IF NOT EXISTS update_project_files_updated_at 
            AFTER UPDATE ON project_files
          BEGIN
            UPDATE project_files SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END`,

          `CREATE TRIGGER IF NOT EXISTS update_project_memories_updated_at 
            AFTER UPDATE ON project_memories
          BEGIN
            UPDATE project_memories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END`,

          `CREATE TRIGGER IF NOT EXISTS update_knowledge_cards_updated_at 
            AFTER UPDATE ON knowledge_cards
          BEGIN
            UPDATE knowledge_cards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
          END`,

          `CREATE TRIGGER IF NOT EXISTS update_app_settings_updated_at 
            AFTER UPDATE ON app_settings
          BEGIN
            UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = NEW.key;
          END`
        ])
        break

      default:
        throw new Error(`Unknown migration version: ${version}`)
    }
  }

  // libsql 原生向量索引创建和管理
  public async createVectorIndex(tableName: string, columnName: string): Promise<void> {
    try {
      const client = this.getClient()

      // 创建向量索引 - libsql 原生支持
      // Note: Vector index creation syntax may vary, let's use a basic index for now
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_${tableName}_${columnName}_vector 
        ON ${tableName}(${columnName})
      `)

      console.log(`Vector index created for ${tableName}.${columnName}`)
    } catch (error) {
      console.warn(`Failed to create vector index for ${tableName}.${columnName}:`, error)
      // Don't throw error, continue without vector index
    }
  }

  public async optimizeVectorQueries(): Promise<void> {
    try {
      const client = this.getClient()

      // Apply general performance optimizations
      // Vector-specific pragmas may not be available in all libsql versions
      await client.execute('PRAGMA cache_size = 10000')
      await client.execute('PRAGMA temp_store = memory')

      console.log('Database query optimization applied')
    } catch (error) {
      console.warn('Failed to optimize vector queries:', error)
      // Don't throw error, continue without optimization
    }
  }

  // 向量数据库操作方法
  public async insertVector(chunkId: string, content: string, embedding: number[]): Promise<void> {
    try {
      const client = this.getClient()

      // 存储向量数据为JSON字符串
      await client.execute({
        sql: 'UPDATE text_chunks SET embedding = ? WHERE id = ?',
        args: [JSON.stringify(embedding), chunkId]
      })

      console.log(`Vector inserted for chunk ${chunkId}`)
    } catch (error) {
      console.error(`Failed to insert vector for chunk ${chunkId}:`, error)
      throw error
    }
  }

  public async searchSimilarVectors(
    queryEmbedding: number[],
    limit: number = 10,
    projectId?: string
  ): Promise<
    Array<{
      id: string
      chunkId: string
      content: string
      fileId: string
      filename: string
      projectId: string
      chunkIndex: number
      distance: number
    }>
  > {
    try {
      const client = this.getClient()

      // For now, return all chunks and calculate similarity in memory
      // This will be optimized with proper vector search later
      let sql = `
        SELECT tc.*, pf.filename, pf.project_id
        FROM text_chunks tc
        JOIN project_files pf ON tc.file_id = pf.id
        WHERE tc.embedding IS NOT NULL
      `

      const args: (string | number)[] = []

      if (projectId) {
        sql += ' AND pf.project_id = ?'
        args.push(projectId)
      }

      sql += ' LIMIT ?'
      args.push(Math.min(limit * 10, 100)) // Get more results for similarity calculation

      const result = await client.execute({
        sql,
        args
      })

      // Calculate similarity in memory (temporary solution)
      const results = result.rows.map((row) => {
        let distance = 1.0 // Default high distance

        if (row.embedding) {
          try {
            const embedding = JSON.parse(row.embedding as string)
            distance = this.calculateEuclideanDistance(queryEmbedding, embedding)
          } catch (error) {
            console.warn('Failed to parse embedding for similarity calculation:', error)
          }
        }

        return {
          id: row.id,
          chunkId: row.id,
          content: row.content,
          fileId: row.file_id,
          filename: row.filename,
          projectId: row.project_id,
          chunkIndex: row.chunk_index,
          distance
        }
      })

      // Sort by distance and return top results
      return results.sort((a, b) => a.distance - b.distance).slice(0, limit)
    } catch (error) {
      console.error('Failed to search similar vectors:', error)
      return []
    }
  }

  private calculateEuclideanDistance(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      return 1.0 // Max distance for incompatible vectors
    }

    let sum = 0
    for (let i = 0; i < vectorA.length; i++) {
      const diff = vectorA[i] - vectorB[i]
      sum += diff * diff
    }

    return Math.sqrt(sum)
  }

  public async deleteVector(chunkId: string): Promise<boolean> {
    try {
      const client = this.getClient()

      await client.execute({
        sql: 'UPDATE text_chunks SET embedding = NULL WHERE id = ?',
        args: [chunkId]
      })

      return true
    } catch (error) {
      console.error(`Failed to delete vector for chunk ${chunkId}:`, error)
      return false
    }
  }

  public async deleteVectors(chunkIds: string[]): Promise<number> {
    try {
      const client = this.getClient()
      let deletedCount = 0

      for (const chunkId of chunkIds) {
        const result = await client.execute({
          sql: 'UPDATE text_chunks SET embedding = NULL WHERE id = ?',
          args: [chunkId]
        })

        if (result.rowsAffected > 0) {
          deletedCount++
        }
      }

      return deletedCount
    } catch (error) {
      console.error('Failed to delete vectors:', error)
      return 0
    }
  }

  // 数据库健康检查
  public async healthCheck(): Promise<{
    status: 'healthy' | 'error'
    details: Record<string, unknown>
  }> {
    try {
      const client = this.getClient()

      // 检查数据库连接
      const result = await client.execute('SELECT 1 as test')

      // 检查表是否存在
      const tables = await client.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `)

      // 检查向量支持
      const vectorSupport = await this.checkVectorSupport()

      return {
        status: 'healthy',
        details: {
          connection: result.rows.length > 0,
          tables: tables.rows.map((t: { name: string }) => t.name),
          vectorSupport,
          dbPath: this.dbPath
        }
      }
    } catch (error) {
      return {
        status: 'error',
        details: { error: (error as Error).message }
      }
    }
  }

  private async checkVectorSupport(): Promise<boolean> {
    try {
      const client = this.getClient()

      // Check if we can store and retrieve JSON vector data
      await client.execute("SELECT json('[1.0, 2.0, 3.0]')")
      return true
    } catch (error) {
      console.warn('Vector support not available:', error)
      return false
    }
  }

  // 获取数据库统计信息
  public async getStats(): Promise<Record<string, unknown>> {
    try {
      const client = this.getClient()

      const [projects, conversations, messages, files, chunks, memories, knowledgeCards] =
        await Promise.all([
          client.execute('SELECT COUNT(*) as count FROM projects'),
          client.execute('SELECT COUNT(*) as count FROM conversations'),
          client.execute('SELECT COUNT(*) as count FROM messages'),
          client.execute('SELECT COUNT(*) as count FROM project_files'),
          client.execute('SELECT COUNT(*) as count FROM text_chunks'),
          client.execute('SELECT COUNT(*) as count FROM project_memories'),
          client.execute('SELECT COUNT(*) as count FROM knowledge_cards')
        ])

      const vectorStats = await this.getVectorStats()

      return {
        projects: { count: projects.rows[0]?.count || 0 },
        conversations: { count: conversations.rows[0]?.count || 0 },
        messages: { count: messages.rows[0]?.count || 0 },
        files: { count: files.rows[0]?.count || 0 },
        chunks: { count: chunks.rows[0]?.count || 0 },
        memories: { count: memories.rows[0]?.count || 0 },
        knowledgeCards: { count: knowledgeCards.rows[0]?.count || 0 },
        vectors: vectorStats
      }
    } catch (error) {
      console.error('Failed to get database stats:', error)
      return {}
    }
  }

  // 获取向量存储统计信息
  public async getVectorStats(): Promise<Record<string, unknown>> {
    try {
      const client = this.getClient()

      const result = await client.execute(
        'SELECT COUNT(*) as count FROM text_chunks WHERE embedding IS NOT NULL'
      )

      return {
        available: await this.checkVectorSupport(),
        documentCount: result.rows[0]?.count || 0
      }
    } catch (error) {
      console.error('Failed to get vector stats:', error)
      return { available: false, documentCount: 0 }
    }
  }

  public isVectorSupportAvailable(): Promise<boolean> {
    return this.checkVectorSupport()
  }

  // 重置数据库（删除文件并重新创建）
  public async resetDatabase(): Promise<void> {
    try {
      // 关闭当前连接
      if (this.client) {
        await this.client.close()
        this.client = null
      }

      // 删除数据库文件和相关文件

      // 删除主数据库文件
      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath)
        console.log('Database file deleted')
      }

      // 删除WAL和SHM文件
      const walPath = this.dbPath + '-wal'
      const shmPath = this.dbPath + '-shm'

      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath)
        console.log('WAL file deleted')
      }

      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath)
        console.log('SHM file deleted')
      }

      // 重新初始化
      await this.initialize()
      console.log('Database reset and reinitialized successfully')
    } catch (error) {
      console.error('Failed to reset database:', error)
      throw error
    }
  }

  // 创建测试数据
  public async createSampleData(): Promise<void> {
    try {
      this.getClient()

      await this.executeTransaction(async (client) => {
        // 创建示例项目
        const projectId = 'sample-project-1'
        await client.execute({
          sql: 'INSERT OR REPLACE INTO projects (id, name, description) VALUES (?, ?, ?)',
          args: [projectId, 'Sample Project', 'A sample project for testing vector operations']
        })

        // 创建示例文件
        const fileId = 'sample-file-1'
        await client.execute({
          sql: 'INSERT OR REPLACE INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [fileId, projectId, 'sample.txt', '/sample/sample.txt', 1024, 'abc123', 'completed']
        })

        // 创建示例文本块和向量数据
        const sampleChunks = [
          {
            id: 'chunk-1',
            content: 'This is a sample text about artificial intelligence and machine learning.',
            embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1) // Random embeddings
          },
          {
            id: 'chunk-2',
            content: 'Vector databases are essential for semantic search and RAG applications.',
            embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1)
          },
          {
            id: 'chunk-3',
            content: 'libsql provides a modern approach to SQLite with enhanced capabilities.',
            embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1)
          },
          {
            id: 'chunk-4',
            content: 'Electron enables cross-platform desktop applications using web technologies.',
            embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1)
          },
          {
            id: 'chunk-5',
            content: 'React and TypeScript provide a robust foundation for modern UI development.',
            embedding: Array.from({ length: 384 }, () => Math.random() * 2 - 1)
          }
        ]

        // 插入文本块
        for (let i = 0; i < sampleChunks.length; i++) {
          const chunk = sampleChunks[i]
          await client.execute({
            sql: 'INSERT OR REPLACE INTO text_chunks (id, file_id, content, chunk_index, embedding) VALUES (?, ?, ?, ?, ?)',
            args: [chunk.id, fileId, chunk.content, i, JSON.stringify(chunk.embedding)]
          })
        }

        // 创建示例会话
        const conversationId = 'sample-conversation-1'
        await client.execute({
          sql: 'INSERT OR REPLACE INTO conversations (id, project_id, title) VALUES (?, ?, ?)',
          args: [conversationId, projectId, 'Sample Conversation']
        })

        // 创建示例消息
        await client.execute({
          sql: 'INSERT OR REPLACE INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['msg-1', conversationId, 'user', 'Tell me about AI and machine learning']
        })

        await client.execute({
          sql: 'INSERT OR REPLACE INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
          args: [
            'msg-2',
            conversationId,
            'assistant',
            'AI and machine learning are fascinating fields that involve creating systems that can learn and make decisions.'
          ]
        })

        // 创建示例项目记忆
        await client.execute({
          sql: 'INSERT OR REPLACE INTO project_memories (id, project_id, type, content) VALUES (?, ?, ?, ?)',
          args: [
            'memory-1',
            projectId,
            'system',
            'This project focuses on AI and vector database technologies.'
          ]
        })

        // 创建示例知识卡片
        await client.execute({
          sql: 'INSERT OR REPLACE INTO knowledge_cards (id, project_id, title, content, tags) VALUES (?, ?, ?, ?, ?)',
          args: [
            'knowledge-1',
            projectId,
            'Vector Databases',
            'Vector databases store high-dimensional vectors and enable similarity search.',
            JSON.stringify(['vectors', 'database', 'search'])
          ]
        })
      })

      console.log('Sample data created successfully')
    } catch (error) {
      console.error('Failed to create sample data:', error)
      throw error
    }
  }

  // 清除所有数据
  public async clearAllData(): Promise<boolean> {
    try {
      const client = this.getClient()

      // 先删除可能存在的问题触发器
      try {
        await client.execute('DROP TRIGGER IF EXISTS messages_fts_insert')
        await client.execute('DROP TRIGGER IF EXISTS messages_fts_delete')
        await client.execute('DROP TRIGGER IF EXISTS messages_fts_update')
        console.log('Dropped existing FTS triggers')
      } catch (triggerError) {
        console.warn('Failed to drop triggers (this is usually harmless):', triggerError)
      }

      // 按照外键依赖顺序删除数据
      await client.execute('DELETE FROM messages')
      await client.execute('DELETE FROM conversations')
      await client.execute('DELETE FROM text_chunks')
      await client.execute('DELETE FROM project_files')
      await client.execute('DELETE FROM project_memories')
      await client.execute('DELETE FROM knowledge_cards')
      await client.execute('DELETE FROM projects')
      await client.execute('DELETE FROM app_settings')

      // 手动清理FTS表
      try {
        await client.execute('DELETE FROM messages_fts')
        console.log('FTS table cleared')
      } catch (ftsError) {
        console.warn('Failed to clear FTS table (this is usually harmless):', ftsError)
      }

      console.log('All data cleared successfully')
      return true
    } catch (error) {
      console.error('Failed to clear data:', error)
      return false
    }
  }
}

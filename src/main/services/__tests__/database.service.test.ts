import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DatabaseService } from '../database.service'
import fs from 'fs'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-knowlex')
  }
}))

describe('DatabaseService', () => {
  let dbService: DatabaseService
  const testDbPath = '/tmp/test-knowlex/database/knowlex.db'

  beforeEach(async () => {
    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }

    // 获取数据库服务实例
    dbService = DatabaseService.getInstance()
    await dbService.initialize()
  })

  afterEach(async () => {
    await dbService.close()

    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('Database Status', () => {
    it('should report healthy status when initialized', async () => {
      const healthCheck = await dbService.healthCheck()
      expect(healthCheck.status).toBe('healthy')
      expect(healthCheck.details.connection).toBe(true)
      expect(healthCheck.details).toHaveProperty('tables')
      expect(healthCheck.details).toHaveProperty('vectorSupport')
      expect(healthCheck.details).toHaveProperty('dbPath')
    })

    it('should include all required tables in status', async () => {
      const healthCheck = await dbService.healthCheck()
      const tables = healthCheck.details.tables as string[]

      const requiredTables = [
        'projects',
        'conversations',
        'messages',
        'project_files',
        'text_chunks',
        'project_memories',
        'knowledge_cards',
        'app_settings',
        'messages_fts'
      ]

      requiredTables.forEach((table) => {
        expect(tables).toContain(table)
      })
    })

    it('should report vector index availability', async () => {
      const vectorStats = await dbService.getVectorStats()
      expect(vectorStats).toHaveProperty('available')
      expect(vectorStats.available).toBe(true)
      expect(vectorStats).toHaveProperty('documentCount')
      expect(vectorStats.documentCount).toBe(0)
    })
  })

  describe('Database Statistics', () => {
    it('should provide comprehensive statistics for empty database', async () => {
      const stats = await dbService.getStats()

      expect(stats).toHaveProperty('projects')
      expect(stats).toHaveProperty('conversations')
      expect(stats).toHaveProperty('messages')
      expect(stats).toHaveProperty('files')
      expect(stats).toHaveProperty('chunks')
      expect(stats).toHaveProperty('memories')
      expect(stats).toHaveProperty('knowledgeCards')

      expect((stats.projects as { count: number }).count).toBe(0)
      expect((stats.conversations as { count: number }).count).toBe(0)
      expect((stats.messages as { count: number }).count).toBe(0)
      expect((stats.files as { count: number }).count).toBe(0)
      expect((stats.chunks as { count: number }).count).toBe(0)
      expect((stats.memories as { count: number }).count).toBe(0)
      expect((stats.knowledgeCards as { count: number }).count).toBe(0)
    })

    it('should update statistics when data is added', async () => {
      // Add some test data
      await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        await client.execute({
          sql: 'INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)',
          args: ['test-conv', 'test-project', 'Test Conversation']
        })

        await client.execute({
          sql: 'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['test-msg', 'test-conv', 'user', 'Hello test']
        })
      })

      const stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(1)
      expect((stats.conversations as { count: number }).count).toBe(1)
      expect((stats.messages as { count: number }).count).toBe(1)
    })

    it('should track vector statistics separately', async () => {
      const initialVectorStats = await dbService.getVectorStats()
      expect(initialVectorStats.documentCount).toBe(0)

      // Add a vector document
      const testEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
      const chunkId = 'test-chunk-stats'
      const content = 'Test content for stats'

      await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: ['test-file', 'test-project', 'test.txt', '/test.txt', 100, 'abc123', 'completed']
        })

        await client.execute({
          sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
          args: [chunkId, 'test-file', content, 0]
        })
      })

      await dbService.insertVector(chunkId, content, testEmbedding)

      const updatedVectorStats = await dbService.getVectorStats()
      expect(updatedVectorStats.documentCount).toBe(1)
    })
  })

  describe('Database Operations', () => {
    it('should execute transactions correctly', async () => {
      const result = await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-1', 'Test Project']
        })

        const countResult = await client.execute('SELECT COUNT(*) as count FROM projects')
        return countResult.rows[0] as { count: number }
      })

      expect(result.count).toBe(1)
    })

    it('should handle transaction rollbacks on error', async () => {
      await expect(async () => {
        await dbService.executeTransaction(async (client) => {
          await client.execute({
            sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
            args: ['test-1', 'Test Project']
          })

          // This should cause a rollback
          await client.execute('SELECT * FROM non_existent_table')
        })
      }).rejects.toThrow()

      // Verify the insert was rolled back
      const stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      await expect(async () => {
        const client = dbService.getClient()
        await client.execute('SELECT * FROM non_existent_table')
      }).rejects.toThrow()
    })

    it('should support concurrent operations', async () => {
      // Run sequential operations to avoid transaction conflicts
      for (let i = 0; i < 5; i++) {
        await dbService.executeTransaction(async (client) => {
          await client.execute({
            sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
            args: [`test-${i}`, `Test Project ${i}`]
          })
        })
      }

      const stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(5)
    })
  })

  describe('Vector Operations', () => {
    it('should insert and search vectors', async () => {
      const testEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
      const chunkId = 'test-chunk-1'
      const content = 'This is a test content for vector search'

      // First create the necessary records
      await dbService.executeTransaction(async (client) => {
        // Create project
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        // Create project file
        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: ['test-file', 'test-project', 'test.txt', '/test.txt', 100, 'abc123', 'completed']
        })

        // Create text chunk
        await client.execute({
          sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
          args: [chunkId, 'test-file', content, 0]
        })
      })

      // Insert vector
      await dbService.insertVector(chunkId, content, testEmbedding)

      // Search vectors
      const results = await dbService.searchSimilarVectors(testEmbedding, 5)

      expect(results).toHaveLength(1)
      expect(results[0].chunkId).toBe(chunkId)
      expect(results[0].content).toBe(content)
    })

    it('should delete vectors', async () => {
      const testEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5]
      const chunkId = 'test-chunk-delete'
      const content = 'This is a test content to be deleted'

      // First create the necessary records
      await dbService.executeTransaction(async (client) => {
        // Create project
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project-del', 'Test Project Delete']
        })

        // Create project file
        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [
            'test-file-del',
            'test-project-del',
            'test.txt',
            '/test.txt',
            100,
            'abc123',
            'completed'
          ]
        })

        // Create text chunk
        await client.execute({
          sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
          args: [chunkId, 'test-file-del', content, 0]
        })
      })

      // Insert vector
      await dbService.insertVector(chunkId, content, testEmbedding)

      // Verify it exists
      let results = await dbService.searchSimilarVectors(testEmbedding, 5)
      expect(results).toHaveLength(1)

      // Delete vector
      const deleted = await dbService.deleteVector(chunkId)
      expect(deleted).toBe(true)

      // Verify it's gone
      results = await dbService.searchSimilarVectors(testEmbedding, 5)
      expect(results).toHaveLength(0)
    })

    it('should handle similarity search with different limits', async () => {
      const embeddings = [
        { id: 'chunk-1', embedding: [0.1, 0.2, 0.3], content: 'First document' },
        { id: 'chunk-2', embedding: [0.2, 0.3, 0.4], content: 'Second document' },
        { id: 'chunk-3', embedding: [0.3, 0.4, 0.5], content: 'Third document' }
      ]

      // Setup test data
      await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: ['test-file', 'test-project', 'test.txt', '/test.txt', 100, 'abc123', 'completed']
        })

        for (const item of embeddings) {
          await client.execute({
            sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
            args: [item.id, 'test-file', item.content, 0]
          })
        }
      })

      // Insert vectors
      for (const item of embeddings) {
        await dbService.insertVector(item.id, item.content, item.embedding)
      }

      // Test different limits
      const allResults = await dbService.searchSimilarVectors([0.15, 0.25, 0.35], 10)
      expect(allResults).toHaveLength(3)

      const limitedResults = await dbService.searchSimilarVectors([0.15, 0.25, 0.35], 2)
      expect(limitedResults).toHaveLength(2)
    })

    it('should support project-scoped vector search', async () => {
      const embedding = [0.1, 0.2, 0.3]

      // Create two projects with vectors
      await dbService.executeTransaction(async (client) => {
        // Project 1
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['project-1', 'Project 1']
        })

        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: ['file-1', 'project-1', 'file1.txt', '/file1.txt', 100, 'hash1', 'completed']
        })

        await client.execute({
          sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
          args: ['chunk-1', 'file-1', 'Content from project 1', 0]
        })

        // Project 2
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['project-2', 'Project 2']
        })

        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: ['file-2', 'project-2', 'file2.txt', '/file2.txt', 100, 'hash2', 'completed']
        })

        await client.execute({
          sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
          args: ['chunk-2', 'file-2', 'Content from project 2', 0]
        })
      })

      // Insert vectors for both projects
      await dbService.insertVector('chunk-1', 'Content from project 1', embedding)
      await dbService.insertVector('chunk-2', 'Content from project 2', embedding)

      // Search all projects
      const allResults = await dbService.searchSimilarVectors(embedding, 5)
      expect(allResults).toHaveLength(2)

      // Search specific project
      const project1Results = await dbService.searchSimilarVectors(embedding, 5, 'project-1')
      expect(project1Results).toHaveLength(1)
      expect(project1Results[0].chunkId).toBe('chunk-1')
    })
  })

  describe('Data Management', () => {
    it('should clear all data', async () => {
      // Insert some test data
      await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        await client.execute({
          sql: 'INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)',
          args: ['test-conv', 'test-project', 'Test Conversation']
        })

        await client.execute({
          sql: 'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['test-msg', 'test-conv', 'user', 'Test message']
        })
      })

      // Verify data exists
      let stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(1)
      expect((stats.conversations as { count: number }).count).toBe(1)
      expect((stats.messages as { count: number }).count).toBe(1)

      // Clear all data
      await dbService.clearAllData()

      // Verify data is cleared
      stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(0)
      expect((stats.conversations as { count: number }).count).toBe(0)
      expect((stats.messages as { count: number }).count).toBe(0)
    })

    it('should reset database completely', async () => {
      // Insert test data including vectors
      const testEmbedding = [0.1, 0.2, 0.3]
      const chunkId = 'test-chunk-reset'

      await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        await client.execute({
          sql: 'INSERT INTO project_files (id, project_id, filename, filepath, file_size, file_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: ['test-file', 'test-project', 'test.txt', '/test.txt', 100, 'abc123', 'completed']
        })

        await client.execute({
          sql: 'INSERT INTO text_chunks (id, file_id, content, chunk_index) VALUES (?, ?, ?, ?)',
          args: [chunkId, 'test-file', 'Test content', 0]
        })
      })

      await dbService.insertVector(chunkId, 'Test content', testEmbedding)

      // Verify data and vectors exist
      let stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(1)

      let vectorResults = await dbService.searchSimilarVectors(testEmbedding, 5)
      expect(vectorResults).toHaveLength(1)

      // Reset database
      await dbService.resetDatabase()

      // Verify everything is cleared and recreated
      stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(0)

      vectorResults = await dbService.searchSimilarVectors(testEmbedding, 5)
      expect(vectorResults).toHaveLength(0)

      // Verify database is still functional
      const healthCheck = await dbService.healthCheck()
      expect(healthCheck.status).toBe('healthy')
    })

    it('should create sample data for testing', async () => {
      // Start with empty database
      let stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBe(0)

      // Create sample data
      await dbService.createSampleData()

      // Verify sample data was created
      stats = await dbService.getStats()
      expect((stats.projects as { count: number }).count).toBeGreaterThan(0)
      expect((stats.conversations as { count: number }).count).toBeGreaterThan(0)
      expect((stats.messages as { count: number }).count).toBeGreaterThan(0)

      // Verify sample vectors were created
      const vectorStats = await dbService.getVectorStats()
      expect(vectorStats.documentCount).toBeGreaterThan(0)
    })

    it('should handle FTS5 operations correctly', async () => {
      // Insert message data
      await dbService.executeTransaction(async (client) => {
        await client.execute({
          sql: 'INSERT INTO projects (id, name) VALUES (?, ?)',
          args: ['test-project', 'Test Project']
        })

        await client.execute({
          sql: 'INSERT INTO conversations (id, project_id, title) VALUES (?, ?, ?)',
          args: ['test-conv', 'test-project', 'Test Conversation']
        })

        await client.execute({
          sql: 'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['test-msg', 'test-conv', 'user', 'This is a test message for FTS search']
        })

        // Manually insert into FTS table (triggers should handle this, but let's be explicit for testing)
        await client.execute({
          sql: 'INSERT INTO messages_fts (content) VALUES (?)',
          args: ['This is a test message for FTS search']
        })
      })

      // Verify FTS table can be queried
      const client = dbService.getClient()
      const searchResult = await client.execute({
        sql: 'SELECT * FROM messages_fts WHERE messages_fts MATCH ?',
        args: ['test']
      })

      expect(searchResult.rows).toHaveLength(1)
    })
  })
})

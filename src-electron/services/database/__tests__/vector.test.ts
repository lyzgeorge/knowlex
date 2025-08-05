import { VectorManager, VectorDocument } from '../vector.manager'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

describe('VectorManager Cross-Platform Tests', () => {
  let vectorManager: VectorManager
  let testDbPath: string

  beforeEach(async () => {
    // Create temporary database path
    testDbPath = path.join(os.tmpdir(), `test_vectors_${Date.now()}.db`)
    
    vectorManager = new VectorManager({
      dbPath: testDbPath,
      dimension: 384, // Smaller dimension for testing
      maxElements: 1000,
      efConstruction: 100,
      m: 8,
    })

    await vectorManager.initialize()
  })

  afterEach(async () => {
    await vectorManager.close()
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

  describe('Basic Vector Operations', () => {
    test('should initialize vector database successfully', () => {
      expect(vectorManager.isReady()).toBe(true)
    })

    test('should insert and retrieve vector documents', async () => {
      const testDocuments: VectorDocument[] = [
        {
          id: 'doc1',
          file_id: 1,
          project_id: 1,
          chunk_index: 0,
          content: 'This is a test document about machine learning.',
          filename: 'test1.txt',
          chunk_start: 0,
          chunk_end: 100,
          created_at: new Date().toISOString(),
          embedding: Array.from({ length: 384 }, () => Math.random()),
        },
        {
          id: 'doc2',
          file_id: 1,
          project_id: 1,
          chunk_index: 1,
          content: 'This document discusses artificial intelligence concepts.',
          filename: 'test1.txt',
          chunk_start: 100,
          chunk_end: 200,
          created_at: new Date().toISOString(),
          embedding: Array.from({ length: 384 }, () => Math.random()),
        },
      ]

      await vectorManager.insertDocuments(testDocuments)

      const count = await vectorManager.getVectorCount(1)
      expect(count).toBe(2)
    })

    test('should perform vector similarity search', async () => {
      const testDocuments: VectorDocument[] = [
        {
          id: 'doc1',
          file_id: 1,
          project_id: 1,
          chunk_index: 0,
          content: 'Machine learning algorithms',
          filename: 'ml.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: [0.1, 0.2, 0.3, ...Array.from({ length: 381 }, () => 0)],
        },
        {
          id: 'doc2',
          file_id: 2,
          project_id: 1,
          chunk_index: 0,
          content: 'Deep learning neural networks',
          filename: 'dl.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: [0.15, 0.25, 0.35, ...Array.from({ length: 381 }, () => 0)],
        },
        {
          id: 'doc3',
          file_id: 3,
          project_id: 1,
          chunk_index: 0,
          content: 'Cooking recipes and ingredients',
          filename: 'cooking.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: [0.8, 0.9, 0.7, ...Array.from({ length: 381 }, () => 0)],
        },
      ]

      await vectorManager.insertDocuments(testDocuments)

      // Search with a query similar to the first two documents
      const queryVector = [0.12, 0.22, 0.32, ...Array.from({ length: 381 }, () => 0)]
      const results = await vectorManager.search(queryVector, 1, 2, 0.1)

      expect(results).toHaveLength(2)
      expect(results[0].content).toContain('Machine learning')
      expect(results[1].content).toContain('Deep learning')
    })

    test('should delete documents by file ID', async () => {
      const testDocuments: VectorDocument[] = [
        {
          id: 'doc1',
          file_id: 1,
          project_id: 1,
          chunk_index: 0,
          content: 'Document from file 1',
          filename: 'file1.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: Array.from({ length: 384 }, () => Math.random()),
        },
        {
          id: 'doc2',
          file_id: 2,
          project_id: 1,
          chunk_index: 0,
          content: 'Document from file 2',
          filename: 'file2.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: Array.from({ length: 384 }, () => Math.random()),
        },
      ]

      await vectorManager.insertDocuments(testDocuments)
      expect(await vectorManager.getVectorCount(1)).toBe(2)

      await vectorManager.deleteByFileId(1)
      expect(await vectorManager.getVectorCount(1)).toBe(1)
    })

    test('should delete documents by project ID', async () => {
      const testDocuments: VectorDocument[] = [
        {
          id: 'doc1',
          file_id: 1,
          project_id: 1,
          chunk_index: 0,
          content: 'Document from project 1',
          filename: 'file1.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: Array.from({ length: 384 }, () => Math.random()),
        },
        {
          id: 'doc2',
          file_id: 2,
          project_id: 2,
          chunk_index: 0,
          content: 'Document from project 2',
          filename: 'file2.txt',
          chunk_start: 0,
          chunk_end: 50,
          created_at: new Date().toISOString(),
          embedding: Array.from({ length: 384 }, () => Math.random()),
        },
      ]

      await vectorManager.insertDocuments(testDocuments)
      expect(await vectorManager.getVectorCount()).toBe(2)

      await vectorManager.deleteByProjectId(1)
      expect(await vectorManager.getVectorCount()).toBe(1)
      expect(await vectorManager.getVectorCount(2)).toBe(1)
    })
  })

  describe('Database Integrity and Optimization', () => {
    test('should pass integrity checks', async () => {
      const integrity = await vectorManager.checkVectorIntegrity()
      expect(integrity).toBe(true)
    })

    test('should optimize database successfully', async () => {
      // Insert some test data first
      const testDocuments: VectorDocument[] = Array.from({ length: 10 }, (_, i) => ({
        id: `doc${i}`,
        file_id: Math.floor(i / 3) + 1,
        project_id: 1,
        chunk_index: i,
        content: `Test document ${i}`,
        filename: `file${Math.floor(i / 3) + 1}.txt`,
        chunk_start: i * 100,
        chunk_end: (i + 1) * 100,
        created_at: new Date().toISOString(),
        embedding: Array.from({ length: 384 }, () => Math.random()),
      }))

      await vectorManager.insertDocuments(testDocuments)

      // Should not throw an error
      await expect(vectorManager.optimizeVectorDatabase()).resolves.not.toThrow()
    })
  })

  describe('Cross-Platform Compatibility', () => {
    test('should work on current platform', () => {
      const platform = os.platform()
      console.log(`Testing on platform: ${platform}`)
      
      // The test should pass regardless of platform
      expect(['win32', 'darwin', 'linux']).toContain(platform)
      expect(vectorManager.isReady()).toBe(true)
    })

    test('should handle large embeddings efficiently', async () => {
      const largeEmbedding = Array.from({ length: 384 }, () => Math.random())
      
      const testDocument: VectorDocument = {
        id: 'large_doc',
        file_id: 1,
        project_id: 1,
        chunk_index: 0,
        content: 'Document with large embedding',
        filename: 'large.txt',
        chunk_start: 0,
        chunk_end: 100,
        created_at: new Date().toISOString(),
        embedding: largeEmbedding,
      }

      const startTime = Date.now()
      await vectorManager.insertDocuments([testDocument])
      const insertTime = Date.now() - startTime

      // Should complete within reasonable time (less than 1 second)
      expect(insertTime).toBeLessThan(1000)

      const searchStartTime = Date.now()
      const results = await vectorManager.search(largeEmbedding, 1, 1)
      const searchTime = Date.now() - searchStartTime

      // Search should also be fast
      expect(searchTime).toBeLessThan(1000)
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('large_doc')
    })

    test('should handle concurrent operations safely', async () => {
      const documents = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent_doc${i}`,
        file_id: i + 1,
        project_id: 1,
        chunk_index: 0,
        content: `Concurrent document ${i}`,
        filename: `concurrent${i}.txt`,
        chunk_start: 0,
        chunk_end: 100,
        created_at: new Date().toISOString(),
        embedding: Array.from({ length: 384 }, () => Math.random()),
      }))

      // Insert documents concurrently
      const insertPromises = documents.map(doc => 
        vectorManager.insertDocuments([doc])
      )

      await Promise.all(insertPromises)

      const finalCount = await vectorManager.getVectorCount(1)
      expect(finalCount).toBe(5)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid embeddings gracefully', async () => {
      const invalidDocument: VectorDocument = {
        id: 'invalid_doc',
        file_id: 1,
        project_id: 1,
        chunk_index: 0,
        content: 'Document with invalid embedding',
        filename: 'invalid.txt',
        chunk_start: 0,
        chunk_end: 100,
        created_at: new Date().toISOString(),
        // Missing embedding
      }

      await expect(vectorManager.insertDocuments([invalidDocument]))
        .rejects.toThrow('missing embedding')
    })

    test('should handle search with mismatched dimensions', async () => {
      const testDocument: VectorDocument = {
        id: 'test_doc',
        file_id: 1,
        project_id: 1,
        chunk_index: 0,
        content: 'Test document',
        filename: 'test.txt',
        chunk_start: 0,
        chunk_end: 100,
        created_at: new Date().toISOString(),
        embedding: Array.from({ length: 384 }, () => Math.random()),
      }

      await vectorManager.insertDocuments([testDocument])

      // Search with wrong dimension
      const wrongDimensionQuery = Array.from({ length: 256 }, () => Math.random())
      
      // Should throw an error for mismatched dimensions
      await expect(vectorManager.search(wrongDimensionQuery, 1, 1))
        .rejects.toThrow('Vector dimensions must match')
    })
  })
})
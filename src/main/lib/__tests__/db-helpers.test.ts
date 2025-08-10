import { describe, it, expect } from 'vitest'
import {
  generateId,
  getCurrentTimestamp,
  validateProjectName,
  validateFileName,
  calculateFileHash,
  buildPaginationQuery,
  buildSearchQuery,
  embeddingToVector,
  vectorToEmbedding,
  rowToProject,
  rowToConversation,
  rowToMessage,
  DatabaseError,
  wrapDatabaseOperation
} from '../db-helpers'

describe('db-helpers', () => {
  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^[0-9a-f-]{36}$/) // UUID format
    })
  })

  describe('getCurrentTimestamp', () => {
    it('should return ISO timestamp', () => {
      const timestamp = getCurrentTimestamp()
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(new Date(timestamp).getTime()).toBeCloseTo(Date.now(), -2)
    })
  })

  describe('validateProjectName', () => {
    it('should validate correct project names', () => {
      expect(validateProjectName('My Project')).toEqual({ valid: true })
      expect(validateProjectName('项目名称')).toEqual({ valid: true })
      expect(validateProjectName('Project-123')).toEqual({ valid: true })
    })

    it('should reject invalid project names', () => {
      expect(validateProjectName('')).toEqual({
        valid: false,
        error: '项目名称不能为空'
      })

      expect(validateProjectName('a'.repeat(101))).toEqual({
        valid: false,
        error: '项目名称不能超过100个字符'
      })

      expect(validateProjectName('Project<>')).toEqual({
        valid: false,
        error: '项目名称包含无效字符'
      })
    })
  })

  describe('validateFileName', () => {
    it('should validate correct file names', () => {
      expect(validateFileName('document.txt')).toEqual({ valid: true })
      expect(validateFileName('README.md')).toEqual({ valid: true })
      expect(validateFileName('文档.txt')).toEqual({ valid: true })
    })

    it('should reject invalid file names', () => {
      expect(validateFileName('')).toEqual({
        valid: false,
        error: '文件名不能为空'
      })

      expect(validateFileName('document.pdf')).toEqual({
        valid: false,
        error: '仅支持 .txt 和 .md 文件格式'
      })

      expect(validateFileName('file<>.txt')).toEqual({
        valid: false,
        error: '文件名包含无效字符'
      })
    })
  })

  describe('calculateFileHash', () => {
    it('should generate consistent hashes', () => {
      const content = 'Hello, World!'
      const hash1 = calculateFileHash(content)
      const hash2 = calculateFileHash(content)

      expect(hash1).toBe(hash2)
      expect(hash1).toBeTruthy()
      expect(typeof hash1).toBe('string')
    })

    it('should generate different hashes for different content', () => {
      const hash1 = calculateFileHash('content1')
      const hash2 = calculateFileHash('content2')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('buildPaginationQuery', () => {
    it('should build basic pagination query', () => {
      const result = buildPaginationQuery('SELECT * FROM table')

      expect(result.query).toBe('SELECT * FROM table LIMIT 20 OFFSET 0')
      expect(result.limit).toBe(20)
      expect(result.offset).toBe(0)
    })

    it('should handle custom pagination options', () => {
      const result = buildPaginationQuery('SELECT * FROM table', {
        page: 3,
        limit: 10,
        sortBy: 'created_at',
        sortOrder: 'ASC'
      })

      expect(result.query).toBe('SELECT * FROM table ORDER BY created_at ASC LIMIT 10 OFFSET 20')
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(20)
    })
  })

  describe('buildSearchQuery', () => {
    it('should build basic search query', () => {
      const query = buildSearchQuery('hello world')
      expect(query).toBe('"hello world"')
    })

    it('should build fuzzy search query', () => {
      const query = buildSearchQuery('hello', { fuzzy: true })
      expect(query).toBe('"hello"*')
    })

    it('should handle empty search term', () => {
      const query = buildSearchQuery('')
      expect(query).toBe('')
    })
  })

  describe('embedding conversion', () => {
    it('should convert embedding to vector string and back', () => {
      const originalEmbedding = [0.1, 0.2, 0.3, -0.4, 0.5]

      const vectorString = embeddingToVector(originalEmbedding)
      expect(typeof vectorString).toBe('string')
      expect(vectorString).toBe(JSON.stringify(originalEmbedding))

      const convertedEmbedding = vectorToEmbedding(vectorString)
      expect(convertedEmbedding).toHaveLength(originalEmbedding.length)

      // 检查数值精度
      for (let i = 0; i < originalEmbedding.length; i++) {
        expect(convertedEmbedding[i]).toBeCloseTo(originalEmbedding[i], 6)
      }
    })

    it('should handle array input in vectorToEmbedding', () => {
      const embedding = [0.1, 0.2, 0.3]
      const result = vectorToEmbedding(embedding)
      expect(result).toEqual(embedding)
    })
  })

  describe('row conversion functions', () => {
    it('should convert database row to project object', () => {
      const row = {
        id: 'proj-1',
        name: 'Test Project',
        description: 'A test project',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      const project = rowToProject(row)
      expect(project).toEqual(row)
    })

    it('should convert database row to conversation object', () => {
      const row = {
        id: 'conv-1',
        project_id: 'proj-1',
        title: 'Test Conversation',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }

      const conversation = rowToConversation(row)
      expect(conversation).toEqual(row)
    })

    it('should convert database row to message object', () => {
      const row = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Hello',
        metadata: '{"files": ["file1.txt"]}',
        created_at: '2024-01-01T00:00:00.000Z'
      }

      const message = rowToMessage(row)
      expect(message.id).toBe('msg-1')
      expect(message.files).toEqual(['file1.txt'])
    })
  })

  describe('DatabaseError', () => {
    it('should create database error with details', () => {
      const error = new DatabaseError('Test error', 'TEST_ERROR', { detail: 'test' })

      expect(error.name).toBe('DatabaseError')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.details).toEqual({ detail: 'test' })
    })
  })

  describe('wrapDatabaseOperation', () => {
    it('should execute operation successfully', async () => {
      const result = await wrapDatabaseOperation(async () => 'success', 'test operation')
      expect(result).toBe('success')
    })

    it('should wrap errors in DatabaseError', async () => {
      await expect(async () => {
        await wrapDatabaseOperation(async () => {
          throw new Error('Original error')
        }, 'test operation')
      }).rejects.toThrow(DatabaseError)
    })
  })
})

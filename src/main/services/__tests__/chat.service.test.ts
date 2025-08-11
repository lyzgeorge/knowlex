import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ChatService } from '../chat.service'
import { DatabaseService } from '../database.service'
import { LLMService } from '../llm.service'
import type { SendMessageRequest, CreateConversationRequest } from '@shared'

// Mock dependencies
vi.mock('../database.service')
vi.mock('../llm.service')

describe('ChatService', () => {
  let chatService: ChatService
  let mockDbService: any
  let mockLLMService: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create a shared mock database object with execute function
    const mockDB = {
      execute: vi.fn()
    }

    // Mock DatabaseService
    mockDbService = {
      getDB: vi.fn().mockReturnValue(mockDB),
      mockDB // Add reference to the mock DB for easier access
    }
    vi.mocked(DatabaseService.getInstance).mockReturnValue(mockDbService)

    // Mock LLMService
    mockLLMService = {
      chat: vi.fn(),
      chatStream: vi.fn(),
      generateTitle: vi.fn()
    }
    vi.mocked(LLMService.getInstance).mockReturnValue(mockLLMService)

    chatService = ChatService.getInstance()
  })

  afterEach(() => {
    // Reset singletons to allow fresh instances in tests
    ;(ChatService as any).instance = null
    ;(DatabaseService as any).instance = null
    ;(LLMService as any).instance = null
    vi.restoreAllMocks()
  })

  describe('conversation management', () => {
    it('should create conversation', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 })
      mockDbService.mockDB.execute = mockExecute

      const request: CreateConversationRequest = {
        projectId: 'project-1',
        title: 'Test Conversation'
      }

      const conversation = await chatService.createConversation(request)

      expect(conversation.title).toBe('Test Conversation')
      expect(conversation.project_id).toBe('project-1')
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO conversations'),
        args: expect.arrayContaining(['project-1', 'Test Conversation'])
      })
    })

    it('should get conversations by project', async () => {
      const mockRows = [
        {
          id: 'conv-1',
          project_id: 'project-1',
          title: 'Conversation 1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ]
      const mockExecute = vi.fn().mockResolvedValue({ rows: mockRows })
      mockDbService.mockDB.execute = mockExecute

      const conversations = await chatService.getConversations('project-1')

      expect(conversations).toHaveLength(1)
      expect(conversations[0].id).toBe('conv-1')
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('WHERE project_id = ?'),
        args: ['project-1']
      })
    })

    it('should update conversation', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 })
      mockDbService.mockDB.execute = mockExecute

      await chatService.updateConversation('conv-1', { title: 'Updated Title' })

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('UPDATE conversations SET'),
        args: expect.arrayContaining(['Updated Title', 'conv-1'])
      })
    })

    it('should delete conversation', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 })
      mockDbService.mockDB.execute = mockExecute

      await chatService.deleteConversation('conv-1')

      expect(mockExecute).toHaveBeenCalledWith({
        sql: 'DELETE FROM conversations WHERE id = ?',
        args: ['conv-1']
      })
    })

    it('should move conversation to project', async () => {
      const mockExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 })
      mockDbService.mockDB.execute = mockExecute

      await chatService.moveConversation('conv-1', 'project-2')

      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining('UPDATE conversations SET'),
        args: expect.arrayContaining(['project-2', 'conv-1'])
      })
    })
  })

  describe('message handling', () => {
    beforeEach(() => {
      // Mock successful database operations
      const mockExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 })
      mockDbService.mockDB.execute = mockExecute

      // Mock LLM response
      mockLLMService.chat.mockResolvedValue({
        id: 'response-1',
        content: 'Hello! How can I help you?',
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 }
      })
    })

    it('should send message without files', async () => {
      // Mock database responses
      mockDbService.mockDB.execute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // getMessages - empty conversation history
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - user message
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - assistant message

      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Hello, AI!'
      }

      const message = await chatService.sendMessage(request)

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('Hello! How can I help you?')
      expect(mockLLMService.chat).toHaveBeenCalledWith({
        messages: expect.arrayContaining([{ role: 'user', content: 'Hello, AI!' }]),
        conversationId: 'conv-1'
      })
    })

    it('should send message with files', async () => {
      // Mock database responses
      mockDbService.mockDB.execute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // getMessages - empty conversation history
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - user message
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - assistant message

      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Analyze this file',
        files: [
          {
            name: 'test.txt',
            content: 'File content here',
            size: 100
          }
        ]
      }

      const message = await chatService.sendMessage(request)

      expect(message.role).toBe('assistant')
      expect(mockLLMService.chat).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          {
            role: 'user',
            content: expect.stringContaining('File content here'),
            files: expect.arrayContaining([
              {
                name: 'test.txt',
                content: 'File content here',
                size: 100
              }
            ])
          }
        ]),
        conversationId: 'conv-1'
      })
    })

    it('should validate file constraints', async () => {
      const largeFiles = Array.from({ length: 15 }, (_, i) => ({
        name: `file${i}.txt`,
        content: 'content',
        size: 100
      }))

      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Process these files',
        files: largeFiles
      }

      await expect(chatService.sendMessage(request)).rejects.toThrow('Failed to send message')
    })

    it('should handle streaming messages', async () => {
      // Mock database responses
      mockDbService.mockDB.execute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // getMessages - empty conversation history
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - user message
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - assistant message

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'start', id: 'stream-1' }
          yield { type: 'token', content: 'Hello', id: 'stream-1' }
          yield { type: 'token', content: ' there!', id: 'stream-1' }
          yield {
            type: 'complete',
            content: 'Hello there!',
            id: 'stream-1',
            metadata: { model: 'gpt-3.5-turbo' }
          }
        }
      }
      mockLLMService.chatStream.mockReturnValue(mockStream)

      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Hello'
      }

      const chunks = []
      for await (const chunk of chatService.sendMessageStream(request)) {
        chunks.push(chunk)
      }

      expect(chunks).toHaveLength(4) // message + start + 2 tokens + complete
      expect(chunks[0].type).toBe('message') // User message saved
      expect(chunks[1].type).toBe('token')
      expect(chunks[3].type).toBe('complete')
    })
  })

  describe('message editing', () => {
    beforeEach(() => {
      // Mock getting original message
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              role: 'user',
              content: 'Original content',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        })
        .mockResolvedValue({ rowsAffected: 1 })

      mockDbService.mockDB.execute = mockExecute
    })

    it('should edit message', async () => {
      // Mock database responses for editMessage
      const originalMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Original content',
        files: null,
        created_at: new Date().toISOString()
      }
      const updatedMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'user',
        content: 'Updated content',
        files: null,
        created_at: new Date().toISOString()
      }

      mockDbService.mockDB.execute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [originalMessage] }) // getMessage - original
        .mockResolvedValueOnce({ rowsAffected: 1 }) // deleteMessagesAfter
        .mockResolvedValueOnce({ rowsAffected: 1 }) // updateMessage
        .mockResolvedValueOnce({ rows: [updatedMessage] }) // getMessage - updated

      const request = {
        messageId: 'msg-1',
        content: 'Updated content'
      }

      const message = await chatService.editMessage(request)

      expect(message?.id).toBe('msg-1')
      expect(message?.content).toBe('Updated content')
    })

    it('should delete messages after edited message', async () => {
      const mockExecute = mockDbService.getDB().execute

      await chatService.editMessage({
        messageId: 'msg-1',
        content: 'Updated content'
      })

      // Should call delete messages after the edited message
      expect(mockExecute).toHaveBeenCalledWith({
        sql: expect.stringContaining(
          'DELETE FROM messages WHERE conversation_id = ? AND created_at >'
        ),
        args: expect.any(Array)
      })
    })
  })

  describe('message regeneration', () => {
    beforeEach(() => {
      // Mock getting original message and other operations
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              role: 'assistant',
              content: 'Original response',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        })
        .mockResolvedValueOnce({ rowsAffected: 1 }) // Delete messages
        .mockResolvedValueOnce({ rows: [] }) // Get messages for context
        .mockResolvedValue({ rowsAffected: 1 }) // Save new message

      mockDbService.mockDB.execute = mockExecute

      // Mock LLM response
      mockLLMService.chat.mockResolvedValue({
        id: 'response-2',
        content: 'Regenerated response',
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    })

    it('should regenerate assistant message', async () => {
      // Mock database responses for regenerateMessage
      const originalMessage = {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        content: 'Original assistant response',
        files: null,
        created_at: new Date().toISOString()
      }

      mockDbService.mockDB.execute = vi
        .fn()
        .mockResolvedValueOnce({ rows: [originalMessage] }) // getMessage - original
        .mockResolvedValueOnce({ rowsAffected: 1 }) // deleteMessagesAfter
        .mockResolvedValueOnce({ rows: [] }) // getMessages for context
        .mockResolvedValueOnce({ rowsAffected: 1 }) // saveMessage - new assistant message

      const request = {
        messageId: 'msg-1',
        temperature: 0.8
      }

      const message = await chatService.regenerateMessage(request)

      expect(message.content).toBe('Regenerated response')
      expect(mockLLMService.chat).toHaveBeenCalledWith({
        messages: [],
        temperature: 0.8,
        conversationId: 'conv-1'
      })
    })

    it('should reject regeneration of user messages', async () => {
      // Mock user message instead of assistant
      const mockExecute = vi.fn().mockResolvedValueOnce({
        rows: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            role: 'user',
            content: 'User message',
            created_at: '2024-01-01T00:00:00Z'
          }
        ]
      })
      mockDbService.mockDB.execute = mockExecute

      const request = {
        messageId: 'msg-1'
      }

      await expect(chatService.regenerateMessage(request)).rejects.toThrow(
        'Invalid message for regeneration'
      )
    })
  })

  describe('auto title generation', () => {
    beforeEach(() => {
      // Enable auto title generation
      chatService.updateConfig({ autoGenerateTitle: true, titleGenerationThreshold: 2 })

      // Mock database operations
      const mockExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 })
      mockDbService.mockDB.execute = mockExecute

      // Mock LLM services
      mockLLMService.chat.mockResolvedValue({
        content: 'AI response',
        model: 'gpt-3.5-turbo',
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 }
      })
      mockLLMService.generateTitle.mockResolvedValue('Generated Title')
    })

    it('should generate title after threshold messages', async () => {
      // Mock getting messages (simulate 2 messages exist)
      const mockExecute = vi
        .fn()
        .mockResolvedValueOnce({ rowsAffected: 1 }) // Save user message
        .mockResolvedValueOnce({ rowsAffected: 1 }) // Save AI message
        .mockResolvedValueOnce({ rowsAffected: 1 }) // Update conversation timestamp
        .mockResolvedValueOnce({
          // Get messages for title generation
          rows: [
            { id: 'msg-1', role: 'user', content: 'Hello' },
            { id: 'msg-2', role: 'assistant', content: 'Hi there!' }
          ]
        })
        .mockResolvedValueOnce({
          // Get conversation
          rows: [
            {
              id: 'conv-1',
              title: '新对话',
              project_id: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          ]
        })
        .mockResolvedValueOnce({ rowsAffected: 1 }) // Update title

      mockDbService.mockDB.execute = mockExecute

      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Hello'
      }

      await chatService.sendMessage(request)

      expect(mockLLMService.generateTitle).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ])
      })
    })
  })

  describe('file validation', () => {
    it('should validate file size limits', async () => {
      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Process this file',
        files: [
          {
            name: 'large-file.txt',
            content: 'x'.repeat(2 * 1024 * 1024), // 2MB content
            size: 2 * 1024 * 1024
          }
        ]
      }

      await expect(chatService.sendMessage(request)).rejects.toThrow('Failed to send message')
    })

    it('should validate file types', async () => {
      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Process this file',
        files: [
          {
            name: 'document.pdf',
            content: 'PDF content',
            size: 1000
          }
        ]
      }

      await expect(chatService.sendMessage(request)).rejects.toThrow('Failed to send message')
    })

    it('should validate file count limits', async () => {
      const manyFiles = Array.from({ length: 15 }, (_, i) => ({
        name: `file${i}.txt`,
        content: 'content',
        size: 100
      }))

      const request: SendMessageRequest = {
        conversationId: 'conv-1',
        content: 'Process these files',
        files: manyFiles
      }

      await expect(chatService.sendMessage(request)).rejects.toThrow('Failed to send message')
    })
  })
})

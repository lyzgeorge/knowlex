/**
 * OpenAI Mock Service Tests
 */

import { openaiMockService, createOpenAIMockService } from '../openai.mock'

describe('OpenAIMockService', () => {
  beforeEach(() => {
    openaiMockService.updateConfig({
      responseDelay: 10, // Faster for tests
      errorRate: 0, // No errors for most tests
    })
  })

  describe('Chat Completion', () => {
    it('should create chat completion', async () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Hello, how are you?' }],
        model: 'gpt-4',
        temperature: 0.7,
      }

      const response = await openaiMockService.createChatCompletion(request)

      expect(response.id).toMatch(/^chatcmpl-/)
      expect(response.object).toBe('chat.completion')
      expect(response.model).toBe(request.model)
      expect(response.choices).toHaveLength(1)
      expect(response.choices[0].message.role).toBe('assistant')
      expect(response.choices[0].message.content).toBeDefined()
      expect(response.usage.promptTokens).toBeGreaterThan(0)
      expect(response.usage.completionTokens).toBeGreaterThan(0)
      expect(response.usage.totalTokens).toBe(
        response.usage.promptTokens + response.usage.completionTokens
      )
    })

    it('should generate contextual responses', async () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'What is artificial intelligence?' }],
        model: 'gpt-4',
      }

      const response = await openaiMockService.createChatCompletion(request)
      const content = response.choices[0].message.content.toLowerCase()

      expect(content).toContain('artificial intelligence')
    })

    it('should handle greeting messages', async () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Hello there!' }],
        model: 'gpt-4',
      }

      const response = await openaiMockService.createChatCompletion(request)
      const content = response.choices[0].message.content.toLowerCase()

      expect(content).toContain('hello')
    })
  })

  describe('Streaming Chat Completion', () => {
    it('should create streaming chat completion', async () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Tell me a short story' }],
        model: 'gpt-4',
        stream: true,
      }

      const chunks: any[] = []
      let completed = false

      const requestId = await openaiMockService.createChatCompletionStream(
        request,
        chunk => {
          chunks.push(chunk)
        },
        () => {
          completed = true
        },
        error => {
          throw error
        }
      )

      // Wait for streaming to complete
      await new Promise(resolve => {
        const checkComplete = () => {
          if (completed) {
            resolve(undefined)
          } else {
            setTimeout(checkComplete, 50)
          }
        }
        checkComplete()
      })

      expect(requestId).toMatch(/^stream-/)
      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks[0].choices[0].delta.role).toBe('assistant')
      expect(chunks[chunks.length - 1].choices[0].finishReason).toBe('stop')
    })

    it('should allow stopping streams', async () => {
      const request = {
        messages: [{ role: 'user' as const, content: 'Tell me a long story' }],
        model: 'gpt-4',
        stream: true,
      }

      const requestId = await openaiMockService.createChatCompletionStream(
        request,
        () => {},
        () => {},
        () => {}
      )

      // Stop the stream immediately
      openaiMockService.stopStream(requestId)

      // Should not throw an error
      expect(() => openaiMockService.stopStream(requestId)).not.toThrow()
    })
  })

  describe('Embeddings', () => {
    it('should create embeddings for single input', async () => {
      const request = {
        input: 'This is a test sentence for embedding',
        model: 'text-embedding-ada-002',
      }

      const response = await openaiMockService.createEmbedding(request)

      expect(response.object).toBe('list')
      expect(response.model).toBe(request.model)
      expect(response.data).toHaveLength(1)
      expect(response.data[0].object).toBe('embedding')
      expect(response.data[0].embedding).toHaveLength(1536) // OpenAI ada-002 dimension
      expect(response.data[0].index).toBe(0)
      expect(response.usage.promptTokens).toBeGreaterThan(0)
    })

    it('should create embeddings for multiple inputs', async () => {
      const request = {
        input: ['First sentence', 'Second sentence', 'Third sentence'],
        model: 'text-embedding-ada-002',
      }

      const response = await openaiMockService.createEmbedding(request)

      expect(response.data).toHaveLength(3)
      response.data.forEach((embedding, index) => {
        expect(embedding.object).toBe('embedding')
        expect(embedding.embedding).toHaveLength(1536)
        expect(embedding.index).toBe(index)
      })
    })

    it('should generate consistent embeddings for same input', async () => {
      const input = 'Consistent test input'
      const request = { input, model: 'text-embedding-ada-002' }

      const response1 = await openaiMockService.createEmbedding(request)
      const response2 = await openaiMockService.createEmbedding(request)

      expect(response1.data[0].embedding).toEqual(response2.data[0].embedding)
    })

    it('should generate normalized embeddings', async () => {
      const request = {
        input: 'Test normalization',
        model: 'text-embedding-ada-002',
      }

      const response = await openaiMockService.createEmbedding(request)
      const embedding = response.data[0].embedding

      // Calculate magnitude
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))

      // Should be approximately 1 (normalized)
      expect(magnitude).toBeCloseTo(1, 5)
    })
  })

  describe('Rerank Service', () => {
    it('should rerank documents', async () => {
      const request = {
        model: 'rerank-english-v2.0',
        query: 'artificial intelligence',
        documents: [
          'AI is a branch of computer science',
          'Machine learning is a subset of AI',
          'The weather is nice today',
          'Deep learning uses neural networks',
        ],
        topK: 3,
      }

      const response = await openaiMockService.rerank(request)

      expect(response.model).toBe(request.model)
      expect(response.results).toHaveLength(3) // topK limit
      expect(response.usage.totalTokens).toBeGreaterThan(0)

      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          response.results[i].relevanceScore
        )
      }

      // Each result should have required properties
      response.results.forEach((result, index) => {
        expect(result.index).toBeDefined()
        expect(result.document).toBeDefined()
        expect(result.relevanceScore).toBeGreaterThanOrEqual(0)
        expect(result.relevanceScore).toBeLessThanOrEqual(1)
      })
    })

    it('should return all documents when no topK specified', async () => {
      const documents = ['Doc 1', 'Doc 2', 'Doc 3', 'Doc 4']
      const request = {
        model: 'rerank-english-v2.0',
        query: 'test query',
        documents,
      }

      const response = await openaiMockService.rerank(request)

      expect(response.results).toHaveLength(documents.length)
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await openaiMockService.testConnection()

      expect(result.success).toBe(true)
      expect(result.latency).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
    })

    it('should simulate connection failures', async () => {
      // Create a service with high error rate for testing
      const errorProneService = createOpenAIMockService({
        apiKey: 'test',
        baseUrl: 'test',
        model: 'test',
        errorRate: 1.0, // 100% error rate
      })

      // Run multiple tests to ensure we get at least one failure
      let failureFound = false
      for (let i = 0; i < 10; i++) {
        const result = await errorProneService.testConnection()
        if (!result.success) {
          failureFound = true
          expect(result.error).toBeDefined()
          expect(result.latency).toBeGreaterThan(0)
          break
        }
      }

      // With 100% error rate, we should definitely get a failure
      expect(failureFound).toBe(true)
    })
  })

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        model: 'gpt-3.5-turbo',
        responseDelay: 200,
        errorRate: 0.1,
      }

      openaiMockService.updateConfig(newConfig)

      // Configuration should be updated (we can't directly test private config,
      // but we can test that it doesn't throw)
      expect(() => openaiMockService.updateConfig(newConfig)).not.toThrow()
    })
  })

  describe('Error Simulation', () => {
    it('should simulate API errors', async () => {
      // Create service with 100% error rate
      const errorService = createOpenAIMockService({
        apiKey: 'test',
        baseUrl: 'test',
        model: 'test',
        errorRate: 1.0,
      })

      await expect(
        errorService.createChatCompletion({
          messages: [{ role: 'user', content: 'test' }],
          model: 'gpt-4',
        })
      ).rejects.toThrow()
    })

    it('should simulate embedding errors', async () => {
      const errorService = createOpenAIMockService({
        apiKey: 'test',
        baseUrl: 'test',
        model: 'test',
        errorRate: 1.0,
      })

      await expect(
        errorService.createEmbedding({
          input: 'test',
          model: 'text-embedding-ada-002',
        })
      ).rejects.toThrow()
    })
  })
})

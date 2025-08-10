import { describe, it, expect, beforeEach } from 'vitest'
import { OpenAIMockService } from '../openai-mock.service'
import { ChatMessage } from '@shared/index'

describe('OpenAIMockService', () => {
  let openaiMockService: OpenAIMockService

  beforeEach(() => {
    openaiMockService = OpenAIMockService.getInstance()
  })

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = openaiMockService.getConfig()

      expect(config.enabled).toBe(true)
      expect(config.models.chat).toContain('gpt-3.5-turbo')
      expect(config.models.chat).toContain('gpt-4')
      expect(config.models.embedding).toContain('text-embedding-3-small')
      expect(config.limits.maxTokens).toBeGreaterThan(0)
      expect(config.responses.streaming).toBe(true)
    })

    it('should update configuration', () => {
      const updates = {
        responses: {
          streaming: false,
          chunkDelay: 100,
          errorRate: 0.1
        }
      }

      openaiMockService.updateConfig(updates)
      const config = openaiMockService.getConfig()

      expect(config.responses.streaming).toBe(false)
      expect(config.responses.chunkDelay).toBe(100)
      expect(config.responses.errorRate).toBe(0.1)
    })
  })

  describe('Model Validation', () => {
    it('should validate chat models', () => {
      expect(openaiMockService.isValidChatModel('gpt-3.5-turbo')).toBe(true)
      expect(openaiMockService.isValidChatModel('gpt-4')).toBe(true)
      expect(openaiMockService.isValidChatModel('invalid-model')).toBe(false)
    })

    it('should validate embedding models', () => {
      expect(openaiMockService.isValidEmbeddingModel('text-embedding-3-small')).toBe(true)
      expect(openaiMockService.isValidEmbeddingModel('text-embedding-3-large')).toBe(true)
      expect(openaiMockService.isValidEmbeddingModel('invalid-model')).toBe(false)
    })
  })

  describe('Chat Completion', () => {
    it('should create chat completion', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello, how are you?' }]
      }

      const response = await openaiMockService.createChatCompletion(request)

      expect(response).toHaveProperty('id')
      expect(response).toHaveProperty('object', 'chat.completion')
      expect(response).toHaveProperty('created')
      expect(response).toHaveProperty('model', 'gpt-3.5-turbo')
      expect(response).toHaveProperty('choices')
      expect(response).toHaveProperty('usage')

      expect(response.choices).toHaveLength(1)
      expect(response.choices[0]).toHaveProperty('index', 0)
      expect(response.choices[0]).toHaveProperty('message')
      expect(response.choices[0]).toHaveProperty('finish_reason', 'stop')
      expect(response.choices[0].message).toHaveProperty('role', 'assistant')
      expect(response.choices[0].message).toHaveProperty('content')
      expect(typeof response.choices[0].message.content).toBe('string')
      expect(response.choices[0].message.content.length).toBeGreaterThan(0)

      expect(response.usage).toHaveProperty('prompt_tokens')
      expect(response.usage).toHaveProperty('completion_tokens')
      expect(response.usage).toHaveProperty('total_tokens')
      expect(typeof response.usage.prompt_tokens).toBe('number')
      expect(typeof response.usage.completion_tokens).toBe('number')
      expect(response.usage.total_tokens).toBe(
        response.usage.prompt_tokens + response.usage.completion_tokens
      )
    })

    it('should validate chat completion request', async () => {
      const invalidRequest = {
        model: 'invalid-model',
        messages: [] as ChatMessage[]
      }

      await expect(openaiMockService.createChatCompletion(invalidRequest)).rejects.toThrow(
        'Invalid model: invalid-model'
      )
    })

    it('should validate message format', async () => {
      const invalidRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'invalid' as any, content: 'Hello' }]
      }

      await expect(openaiMockService.createChatCompletion(invalidRequest)).rejects.toThrow(
        'Invalid message role: invalid'
      )
    })

    it('should handle temperature and max_tokens parameters', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 100
      }

      const response = await openaiMockService.createChatCompletion(request)
      expect(response.model).toBe('gpt-3.5-turbo')
      expect(response.choices[0].message.content).toBeDefined()
    })
  })

  describe('Streaming Chat Completion', () => {
    it('should create streaming chat completion', async () => {
      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }]
      }

      const chunks: string[] = []
      const generator = openaiMockService.createChatCompletionStream(request)

      for await (const chunk of generator) {
        chunks.push(chunk)

        if (chunk === '[DONE]') {
          break
        }

        // Parse chunk (should be valid JSON)
        if (chunk.startsWith('data: ')) {
          const jsonStr = chunk.substring(6)
          if (jsonStr !== '[DONE]') {
            const parsed = JSON.parse(jsonStr)
            expect(parsed).toHaveProperty('id')
            expect(parsed).toHaveProperty('object', 'chat.completion.chunk')
            expect(parsed).toHaveProperty('created')
            expect(parsed).toHaveProperty('model', 'gpt-3.5-turbo')
            expect(parsed).toHaveProperty('choices')
            expect(parsed.choices).toHaveLength(1)
          }
        }
      }

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[chunks.length - 1]).toBe('[DONE]')
    }, 10000) // Increase timeout to 10 seconds

    it('should handle streaming errors', async () => {
      // Set high error rate to force error
      openaiMockService.updateConfig({
        responses: { streaming: true, chunkDelay: 10, errorRate: 1.0 }
      })

      const request = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user' as const, content: 'Hello' }]
      }

      const chunks: string[] = []
      const generator = openaiMockService.createChatCompletionStream(request)

      let hasError = false
      for await (const chunk of generator) {
        chunks.push(chunk)

        if (chunk.includes('error')) {
          hasError = true
          break
        }
      }

      expect(hasError).toBe(true)

      // Reset error rate
      openaiMockService.updateConfig({
        responses: { streaming: true, chunkDelay: 50, errorRate: 0.02 }
      })
    })
  })

  describe('Embeddings', () => {
    it('should create embeddings for single input', async () => {
      const request = {
        model: 'text-embedding-3-small',
        input: 'This is a test sentence for embedding.'
      }

      const response = await openaiMockService.createEmbedding(request)

      expect(response).toHaveProperty('object', 'list')
      expect(response).toHaveProperty('data')
      expect(response).toHaveProperty('model', 'text-embedding-3-small')
      expect(response).toHaveProperty('usage')

      expect(response.data).toHaveLength(1)
      expect(response.data[0]).toHaveProperty('object', 'embedding')
      expect(response.data[0]).toHaveProperty('embedding')
      expect(response.data[0]).toHaveProperty('index', 0)

      const embedding = response.data[0].embedding
      expect(Array.isArray(embedding)).toBe(true)
      expect(embedding.length).toBe(384) // text-embedding-3-small default dimensions
      expect(embedding.every((val) => typeof val === 'number')).toBe(true)

      // Check if embedding is normalized (unit vector)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
      expect(magnitude).toBeCloseTo(1.0, 5)
    })

    it('should create embeddings for multiple inputs', async () => {
      const request = {
        model: 'text-embedding-3-small',
        input: ['First test sentence.', 'Second test sentence.', 'Third test sentence.']
      }

      const response = await openaiMockService.createEmbedding(request)

      expect(response.data).toHaveLength(3)

      response.data.forEach((item, index) => {
        expect(item.index).toBe(index)
        expect(item.embedding).toHaveLength(384)
        expect(Array.isArray(item.embedding)).toBe(true)
      })

      expect(response.usage.prompt_tokens).toBeGreaterThan(0)
      expect(response.usage.total_tokens).toBe(response.usage.prompt_tokens)
    })

    it('should handle custom dimensions', async () => {
      const request = {
        model: 'text-embedding-3-small',
        input: 'Test sentence',
        dimensions: 256
      }

      const response = await openaiMockService.createEmbedding(request)
      expect(response.data[0].embedding).toHaveLength(256)
    })

    it('should validate embedding request', async () => {
      const invalidRequest = {
        model: 'invalid-embedding-model',
        input: 'Test'
      }

      await expect(openaiMockService.createEmbedding(invalidRequest)).rejects.toThrow(
        'Invalid embedding model: invalid-embedding-model'
      )
    })

    it('should generate deterministic embeddings', async () => {
      const input = 'Consistent test input'

      const request1 = {
        model: 'text-embedding-3-small',
        input
      }

      const request2 = {
        model: 'text-embedding-3-small',
        input
      }

      const response1 = await openaiMockService.createEmbedding(request1)
      const response2 = await openaiMockService.createEmbedding(request2)

      // Same input should produce same embedding
      expect(response1.data[0].embedding).toEqual(response2.data[0].embedding)
    })
  })

  describe('Connection Testing', () => {
    it('should test successful connection', async () => {
      const config = {
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      }

      const result = await openaiMockService.testConnection(config)

      if (result.success) {
        expect(result).toHaveProperty('success', true)
        expect(result).toHaveProperty('latency')
        expect(result).toHaveProperty('details')
        expect(typeof result.latency).toBe('number')
        expect(result.latency).toBeGreaterThan(0)
        expect(result.details).toHaveProperty('model', 'gpt-3.5-turbo')
        expect(result.details).toHaveProperty('provider', 'openai')
      } else {
        expect(result).toHaveProperty('success', false)
        expect(result).toHaveProperty('error')
        expect(typeof result.error).toBe('string')
      }
    })

    it('should handle connection with custom baseURL', async () => {
      const config = {
        apiKey: 'test-key',
        baseURL: 'https://custom-api.example.com/v1',
        model: 'gpt-4'
      }

      const result = await openaiMockService.testConnection(config)

      if (result.success) {
        expect(result.details).toHaveProperty('baseURL', 'https://custom-api.example.com/v1')
        expect(result.details).toHaveProperty('model', 'gpt-4')
      }
    })
  })

  describe('Utility Methods', () => {
    it('should generate usage statistics', () => {
      const stats = openaiMockService.generateUsageStats()

      expect(stats).toHaveProperty('requests')
      expect(stats).toHaveProperty('tokens')
      expect(stats).toHaveProperty('cost')
      expect(stats).toHaveProperty('period')

      expect(typeof stats.requests).toBe('number')
      expect(typeof stats.tokens).toBe('number')
      expect(typeof stats.cost).toBe('number')
      expect(stats.period).toBe('current_month')

      expect(stats.requests).toBeGreaterThan(0)
      expect(stats.tokens).toBeGreaterThan(0)
      expect(stats.cost).toBeGreaterThan(0)
    })

    it('should get available models', () => {
      const models = openaiMockService.getAvailableModels()

      expect(models).toHaveProperty('chat')
      expect(models).toHaveProperty('embedding')

      expect(Array.isArray(models.chat)).toBe(true)
      expect(Array.isArray(models.embedding)).toBe(true)

      expect(models.chat.length).toBeGreaterThan(0)
      expect(models.embedding.length).toBeGreaterThan(0)

      models.chat.forEach((model) => {
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('name')
        expect(model).toHaveProperty('context_window')
        expect(typeof model.context_window).toBe('number')
      })

      models.embedding.forEach((model) => {
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('name')
        expect(model).toHaveProperty('dimensions')
        expect(typeof model.dimensions).toBe('number')
      })
    })
  })
})

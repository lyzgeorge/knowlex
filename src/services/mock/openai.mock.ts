/**
 * OpenAI Mock Service
 *
 * Provides mock implementations for OpenAI API calls including chat completions,
 * embeddings, and streaming responses for development and testing.
 */

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  RerankRequest,
  RerankResponse,
} from '@knowlex/types'

export interface MockOpenAIConfig {
  apiKey: string
  baseUrl: string
  model: string
  responseDelay?: number
  errorRate?: number
}

export class OpenAIMockService {
  private config: MockOpenAIConfig
  private streamingRequests = new Map<string, NodeJS.Timeout>()

  constructor(config: MockOpenAIConfig) {
    this.config = {
      responseDelay: 100,
      errorRate: 0.05, // 5% error rate
      ...config,
    }
  }

  /**
   * Mock chat completion (non-streaming)
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // console.log('[OpenAI Mock] Chat completion request:', request)

    // Simulate API delay
    await this.delay(this.config.responseDelay!)

    // Simulate random errors
    if (Math.random() < this.config.errorRate!) {
      throw new Error('Mock API error: Rate limit exceeded')
    }

    const mockResponse = this.generateMockChatResponse(request)

    const response: ChatCompletionResponse = {
      _id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          _index: 0,
          _message: {
            role: 'assistant',
            content: mockResponse,
          },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens: this.estimateTokens(request.messages.map(m => m.content).join(' ')),
        completionTokens: this.estimateTokens(mockResponse),
        totalTokens: 0,
      },
    }

    response.usage.totalTokens = response.usage.promptTokens + response.usage.completionTokens

    return response
  }

  /**
   * Mock streaming chat completion
   */
  async createChatCompletionStream(
    request: ChatCompletionRequest,
    onChunk: (chunk: ChatCompletionStreamChunk) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<string> {
    // console.log('[OpenAI Mock] Streaming chat completion request:', request)

    const requestId = `stream-${Date.now()}`
    const mockResponse = this.generateMockChatResponse(request)
    const words = mockResponse.split(' ')

    let currentIndex = 0
    const streamId = `chatcmpl-${Date.now()}`

    // Send initial chunk with role
    onChunk({
      _id: streamId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          _index: 0,
          delta: { role: 'assistant' },
          finishReason: null,
        },
      ],
    })

    const streamInterval = setInterval(
      () => {
        try {
          if (currentIndex < words.length) {
            // Send content chunk
            onChunk({
              _id: streamId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model,
              choices: [
                {
                  _index: 0,
                  delta: { content: words[currentIndex] + ' ' },
                  finishReason: null,
                },
              ],
            })
            currentIndex++
          } else {
            // Send final chunk
            onChunk({
              _id: streamId,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: request.model,
              choices: [
                {
                  _index: 0,
                  delta: {},
                  finishReason: 'stop',
                },
              ],
            })

            clearInterval(streamInterval)
            this.streamingRequests.delete(requestId)
            onComplete()
          }
        } catch (error) {
          clearInterval(streamInterval)
          this.streamingRequests.delete(requestId)
          onError(error as Error)
        }
      },
      50 + Math.random() * 100
    ) // Variable delay

    this.streamingRequests.set(requestId, streamInterval)
    return requestId
  }

  /**
   * Stop streaming response
   */
  stopStream(requestId: string): void {
    const interval = this.streamingRequests.get(requestId)
    if (interval) {
      clearInterval(interval)
      this.streamingRequests.delete(requestId)
      // console.log(`[OpenAI Mock] Stopped stream: ${requestId}`)
    }
  }

  /**
   * Mock embedding generation
   */
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // console.log('[OpenAI Mock] Embedding request:', request)

    await this.delay(this.config.responseDelay!)

    if (Math.random() < this.config.errorRate!) {
      throw new Error('Mock API error: Invalid input')
    }

    const inputs = Array.isArray(request.input) ? request.input : [request.input]
    const embeddings = inputs.map((input, _index) => ({
      object: 'embedding',
      embedding: this.generateMockEmbedding(input),
      _index,
    }))

    const response: EmbeddingResponse = {
      object: 'list',
      data: embeddings,
      model: request.model,
      usage: {
        promptTokens: inputs.reduce((sum, input) => sum + this.estimateTokens(input), 0),
        totalTokens: 0,
      },
    }

    response.usage.totalTokens = response.usage.promptTokens

    return response
  }

  /**
   * Mock rerank service
   */
  async rerank(request: RerankRequest): Promise<RerankResponse> {
    // console.log('[OpenAI Mock] Rerank request:', request)

    await this.delay(this.config.responseDelay!)

    if (Math.random() < this.config.errorRate!) {
      throw new Error('Mock API error: Service unavailable')
    }

    // Generate mock relevance scores
    const results = request.documents.map((document, _index) => ({
      _index,
      document,
      relevanceScore: Math.random() * 0.5 + 0.5, // Score between 0.5 and 1.0
    }))

    // Sort by relevance score (descending)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Apply topK limit if specified
    const topResults = request.topK ? results.slice(0, request.topK) : results

    const response: RerankResponse = {
      results: topResults,
      model: request.model,
      usage: {
        totalTokens: this.estimateTokens(request.query + request.documents.join(' ')),
      },
    }

    return response
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    const startTime = Date.now()

    try {
      await this.delay(50 + Math.random() * 200)

      if (Math.random() < this.config.errorRate!) {
        // Use configured error rate
        throw new Error('Connection timeout')
      }

      return {
        success: true,
        latency: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: (error as Error)._message,
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MockOpenAIConfig>): void {
    this.config = { ...this.config, ...config }
    // console.log('[OpenAI Mock] Config updated:', this.config)
  }

  private generateMockChatResponse(request: ChatCompletionRequest): string {
    const lastMessage = request.messages[request.messages.length - 1]
    const userMessage = lastMessage?.content || ''

    // Generate contextual responses based on user input
    if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
      return "Hello! I'm a mock AI assistant. How can I help you today?"
    }

    if (userMessage.toLowerCase().includes('what') && userMessage.toLowerCase().includes('ai')) {
      return 'Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks that typically require human intelligence. This includes learning, reasoning, problem-solving, perception, and language understanding.'
    }

    if (
      userMessage.toLowerCase().includes('code') ||
      userMessage.toLowerCase().includes('programming')
    ) {
      return "I can help you with programming and coding questions! Whether you need help with algorithms, debugging, best practices, or learning new technologies, I'm here to assist. What specific programming topic would you like to explore?"
    }

    if (
      userMessage.toLowerCase().includes('explain') ||
      userMessage.toLowerCase().includes('how')
    ) {
      return `I'd be happy to explain that concept! Based on your question about "${userMessage.substring(0, 50)}...", here's a comprehensive explanation: This is a mock response that would normally provide detailed information about your topic. The actual AI would analyze your question and provide relevant, accurate information.`
    }

    // Default response
    return `Thank you for your _message: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}". This is a mock response from the AI assistant. In a real implementation, I would provide a thoughtful and helpful response based on your specific question or request.`
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate a deterministic but pseudo-random embedding based on text content
    const dimension = 1536 // OpenAI ada-002 dimension
    const embedding: number[] = []

    // Use text hash as seed for consistent embeddings
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    // Generate embedding values
    for (let i = 0; i < dimension; i++) {
      // Use hash and _index to generate pseudo-random values
      const seed = hash + i * 1234567
      const value = (Math.sin(seed) * 10000) % 1
      embedding.push(value)
    }

    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map(val => val / magnitude)
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export factory function for creating mock instances
export function createOpenAIMockService(config: MockOpenAIConfig): OpenAIMockService {
  return new OpenAIMockService(config)
}

// Export default instance with default config
export const openaiMockService = new OpenAIMockService({
  apiKey: 'mock-api-key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4',
  responseDelay: 100,
  errorRate: 0.05,
})

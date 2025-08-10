import type { ChatMessage, ConnectionTestResult } from '@shared'
import { MockService } from './mock.service'

// OpenAI API 模拟配置
export interface OpenAIMockConfig {
  enabled: boolean
  models: {
    chat: string[]
    embedding: string[]
  }
  limits: {
    maxTokens: number
    maxMessages: number
    contextWindow: number
  }
  responses: {
    streaming: boolean
    chunkDelay: number
    errorRate: number
  }
}

// 默认配置
const DEFAULT_OPENAI_MOCK_CONFIG: OpenAIMockConfig = {
  enabled: true,
  models: {
    chat: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    embedding: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002']
  },
  limits: {
    maxTokens: 4096,
    maxMessages: 50,
    contextWindow: 16384
  },
  responses: {
    streaming: true,
    chunkDelay: 50,
    errorRate: 0.02 // 2% 错误率
  }
}

// Chat Completion 请求接口
export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  stop?: string | string[]
}

// Chat Completion 响应接口
export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Embedding 请求接口
export interface EmbeddingRequest {
  model: string
  input: string | string[]
  encoding_format?: 'float' | 'base64'
  dimensions?: number
}

// Embedding 响应接口
export interface EmbeddingResponse {
  object: string
  data: {
    object: string
    embedding: number[]
    index: number
  }[]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// OpenAI Mock 服务
export class OpenAIMockService {
  private static instance: OpenAIMockService
  private config: OpenAIMockConfig = DEFAULT_OPENAI_MOCK_CONFIG
  private mockService: MockService

  private constructor() {
    this.mockService = MockService.getInstance()
  }

  static getInstance(): OpenAIMockService {
    if (!OpenAIMockService.instance) {
      OpenAIMockService.instance = new OpenAIMockService()
    }
    return OpenAIMockService.instance
  }

  // 配置管理
  getConfig(): OpenAIMockConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<OpenAIMockConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  // 模型验证
  isValidChatModel(model: string): boolean {
    return this.config.models.chat.includes(model)
  }

  isValidEmbeddingModel(model: string): boolean {
    return this.config.models.embedding.includes(model)
  }

  // Chat Completion API 模拟
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // 验证请求
    this.validateChatRequest(request)

    // 模拟延迟
    await this.mockService.simulateDelay('medium')

    // 模拟错误
    if (this.mockService.shouldSimulateError()) {
      throw this.createOpenAIError('rate_limit_exceeded', 'Rate limit exceeded')
    }

    // 生成响应
    const response = this.generateChatResponse(request)
    return response
  }

  // 流式 Chat Completion API 模拟
  async *createChatCompletionStream(request: ChatCompletionRequest): AsyncGenerator<string> {
    // 验证请求
    this.validateChatRequest(request)

    const id = `chatcmpl-${Date.now()}`
    const created = Math.floor(Date.now() / 1000)
    const model = request.model

    // 发送开始事件
    yield this.formatStreamChunk({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: '' },
          finish_reason: null
        }
      ]
    })

    // 生成响应内容 - 使用较短的内容以避免测试超时
    const content = this.generateResponseContent(request.messages)
    const shortContent = content.length > 200 ? content.substring(0, 200) + '...' : content
    const chunks = this.splitIntoChunks(shortContent, 15) // 每块15个字符，减少块数

    // 发送内容块
    for (let i = 0; i < chunks.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(this.config.responses.chunkDelay, 30))
      )

      // 模拟流式错误 - 降低错误概率以避免测试中断
      if (this.config.responses.errorRate > 0.5 && i > chunks.length / 2) {
        yield this.formatStreamChunk({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'error'
            }
          ],
          error: {
            message: 'Stream interrupted',
            type: 'server_error',
            code: 'internal_error'
          }
        })
        return
      }

      yield this.formatStreamChunk({
        id,
        object: 'chat.completion.chunk',
        created,
        model,
        choices: [
          {
            index: 0,
            delta: { content: chunks[i] },
            finish_reason: null
          }
        ]
      })
    }

    // 发送结束事件
    yield this.formatStreamChunk({
      id,
      object: 'chat.completion.chunk',
      created,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }
      ]
    })

    // 发送完成标记
    yield '[DONE]'
  }

  // Embedding API 模拟
  async createEmbedding(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    // 验证请求
    this.validateEmbeddingRequest(request)

    // 模拟延迟
    await this.mockService.simulateDelay('short')

    // 模拟错误 - 使用本地错误率而不是 MockService
    if (Math.random() < this.config.responses.errorRate) {
      throw this.createOpenAIError('invalid_request_error', 'Invalid embedding request')
    }

    // 生成响应
    const inputs = Array.isArray(request.input) ? request.input : [request.input]
    const dimensions =
      request.dimensions || (request.model === 'text-embedding-3-small' ? 384 : 1536)

    const data = inputs.map((input, index) => ({
      object: 'embedding',
      embedding: this.generateEmbedding(input, dimensions),
      index
    }))

    return {
      object: 'list',
      data,
      model: request.model,
      usage: {
        prompt_tokens: inputs.reduce((sum, input) => sum + this.estimateTokens(input), 0),
        total_tokens: inputs.reduce((sum, input) => sum + this.estimateTokens(input), 0)
      }
    }
  }

  // 连接测试
  async testConnection(config: {
    apiKey: string
    baseURL?: string
    model?: string
  }): Promise<ConnectionTestResult> {
    await this.mockService.simulateDelay('medium')

    // 模拟连接失败
    if (this.mockService.shouldSimulateError()) {
      return {
        success: false,
        error: 'Authentication failed: Invalid API key',
        details: {
          statusCode: 401,
          type: 'invalid_api_key',
          timestamp: new Date().toISOString()
        }
      }
    }

    // 模拟成功连接
    return {
      success: true,
      latency: Math.floor(Math.random() * 300) + 100, // 100-400ms
      details: {
        model: config.model || 'gpt-3.5-turbo',
        provider: 'openai',
        baseURL: config.baseURL || 'https://api.openai.com/v1',
        timestamp: new Date().toISOString()
      }
    }
  }

  // 私有方法

  private validateChatRequest(request: ChatCompletionRequest): void {
    if (!request.model || !this.isValidChatModel(request.model)) {
      throw this.createOpenAIError('invalid_request_error', `Invalid model: ${request.model}`)
    }

    if (!request.messages || !Array.isArray(request.messages) || request.messages.length === 0) {
      throw this.createOpenAIError(
        'invalid_request_error',
        'Messages array is required and cannot be empty'
      )
    }

    if (request.messages.length > this.config.limits.maxMessages) {
      throw this.createOpenAIError(
        'invalid_request_error',
        `Too many messages. Maximum: ${this.config.limits.maxMessages}`
      )
    }

    if (request.max_tokens && request.max_tokens > this.config.limits.maxTokens) {
      throw this.createOpenAIError(
        'invalid_request_error',
        `max_tokens too large. Maximum: ${this.config.limits.maxTokens}`
      )
    }

    // 验证消息格式
    for (const message of request.messages) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        throw this.createOpenAIError(
          'invalid_request_error',
          `Invalid message role: ${message.role}`
        )
      }
      if (!message.content || typeof message.content !== 'string') {
        throw this.createOpenAIError(
          'invalid_request_error',
          'Message content is required and must be a string'
        )
      }
    }
  }

  private validateEmbeddingRequest(request: EmbeddingRequest): void {
    if (!request.model || !this.isValidEmbeddingModel(request.model)) {
      throw this.createOpenAIError(
        'invalid_request_error',
        `Invalid embedding model: ${request.model}`
      )
    }

    if (!request.input) {
      throw this.createOpenAIError('invalid_request_error', 'Input is required')
    }

    const inputs = Array.isArray(request.input) ? request.input : [request.input]
    if (inputs.length === 0) {
      throw this.createOpenAIError('invalid_request_error', 'Input cannot be empty')
    }

    if (inputs.length > 100) {
      throw this.createOpenAIError('invalid_request_error', 'Too many inputs. Maximum: 100')
    }

    for (const input of inputs) {
      if (typeof input !== 'string' || input.trim().length === 0) {
        throw this.createOpenAIError(
          'invalid_request_error',
          'All inputs must be non-empty strings'
        )
      }
    }

    // Validate dimensions parameter
    if (request.dimensions !== undefined) {
      if (typeof request.dimensions !== 'number' || request.dimensions <= 0) {
        throw this.createOpenAIError(
          'invalid_request_error',
          'Dimensions must be a positive number'
        )
      }

      // Check if dimensions are supported for the model
      const maxDimensions =
        request.model === 'text-embedding-3-small'
          ? 1536
          : request.model === 'text-embedding-3-large'
            ? 3072
            : 1536

      if (request.dimensions > maxDimensions) {
        throw this.createOpenAIError(
          'invalid_request_error',
          `Dimensions too large for model ${request.model}. Maximum: ${maxDimensions}`
        )
      }
    }
  }

  private generateChatResponse(request: ChatCompletionRequest): ChatCompletionResponse {
    const id = `chatcmpl-${Date.now()}`
    const created = Math.floor(Date.now() / 1000)
    const content = this.generateResponseContent(request.messages)

    const promptTokens = this.estimateTokens(request.messages.map((m) => m.content).join(' '))
    const completionTokens = this.estimateTokens(content)

    return {
      id,
      object: 'chat.completion',
      created,
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    }
  }

  private generateResponseContent(messages: ChatMessage[]): string {
    const lastMessage = messages[messages.length - 1]
    const userContent = lastMessage.content.toLowerCase()

    // 基于用户输入生成相关响应
    if (userContent.includes('vector') || userContent.includes('embedding')) {
      return `Vector databases and embeddings are fundamental technologies for semantic search and RAG applications. Here's what you need to know:

**Vector Embeddings**: These are numerical representations of text, images, or other data that capture semantic meaning in high-dimensional space.

**Key Concepts**:
1. **Similarity Search**: Find similar items using distance metrics like cosine similarity
2. **Dimensionality**: Common dimensions are 384, 768, or 1536 depending on the model
3. **Indexing**: Techniques like HNSW or IVF enable fast approximate search

**Implementation Tips**:
- Choose appropriate embedding models for your domain
- Consider chunking strategies for long documents
- Implement proper error handling and fallbacks
- Monitor performance and optimize as needed

Would you like me to elaborate on any specific aspect of vector databases or embeddings?`
    }

    if (userContent.includes('react') || userContent.includes('component')) {
      return `React component development follows several best practices for maintainable and performant applications:

**Component Design Principles**:
1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Build complex UIs by combining simple components
3. **Props Interface**: Define clear, typed interfaces for component props

**Performance Optimization**:
- Use React.memo() for expensive components
- Implement proper key props for lists
- Avoid inline object/function creation in render
- Consider code splitting with React.lazy()

**State Management**:
- Use local state for component-specific data
- Lift state up when multiple components need access
- Consider context for deeply nested prop drilling
- Use reducers for complex state logic

**Testing Strategies**:
- Unit test individual components
- Integration test component interactions
- Use React Testing Library for user-centric tests

What specific aspect of React development would you like to explore further?`
    }

    if (userContent.includes('typescript') || userContent.includes('type')) {
      return `TypeScript provides powerful type safety and developer experience improvements for JavaScript applications:

**Core Type System**:
- **Primitive Types**: string, number, boolean, null, undefined
- **Object Types**: interfaces and type aliases
- **Union Types**: string | number for flexible types
- **Generic Types**: <T> for reusable, type-safe code

**Advanced Features**:
1. **Utility Types**: Partial<T>, Required<T>, Pick<T, K>, Omit<T, K>
2. **Conditional Types**: T extends U ? X : Y
3. **Mapped Types**: { [K in keyof T]: T[K] }
4. **Template Literal Types**: \`prefix-\${string}\`

**Best Practices**:
- Prefer interfaces over type aliases for object shapes
- Use strict mode configuration
- Leverage type inference where possible
- Create custom type guards for runtime validation

**Integration Tips**:
- Configure proper tsconfig.json
- Use ESLint with TypeScript rules
- Set up proper IDE support
- Implement gradual adoption strategies

Which TypeScript concept would you like me to explain in more detail?`
    }

    if (userContent.includes('database') || userContent.includes('sql')) {
      return `Database design and optimization are crucial for application performance and scalability:

**Schema Design**:
1. **Normalization**: Reduce data redundancy through proper table relationships
2. **Indexing Strategy**: Create indexes on frequently queried columns
3. **Data Types**: Choose appropriate types for storage efficiency
4. **Constraints**: Implement foreign keys, unique constraints, and checks

**Query Optimization**:
- Use EXPLAIN to analyze query execution plans
- Avoid N+1 query problems
- Implement proper pagination
- Consider query caching strategies

**libsql Specific Features**:
- Native vector support for embeddings
- WAL mode for better concurrency
- FTS5 for full-text search
- JSON support for flexible schemas

**Performance Monitoring**:
- Track slow queries
- Monitor connection pool usage
- Analyze index effectiveness
- Set up proper logging

**Backup and Recovery**:
- Implement regular backup schedules
- Test recovery procedures
- Consider point-in-time recovery needs

What specific database topic would you like to dive deeper into?`
    }

    // 默认通用响应
    const responses = [
      `I understand you're asking about "${lastMessage.content.substring(0, 50)}...". Let me provide you with a comprehensive response.

Based on the context and information available, here are the key points to consider:

**Main Concepts**:
1. **Understanding the Problem**: It's important to first clearly define what you're trying to achieve
2. **Available Solutions**: There are several approaches you can take, each with their own trade-offs
3. **Best Practices**: Following established patterns will help ensure maintainable and scalable results

**Implementation Considerations**:
- Start with a simple approach and iterate
- Consider performance implications early
- Plan for error handling and edge cases
- Document your decisions and reasoning

**Next Steps**:
- Identify the specific requirements for your use case
- Research existing solutions and libraries
- Create a proof of concept to validate your approach
- Implement with proper testing and monitoring

Would you like me to elaborate on any specific aspect of this topic?`,

      `Thank you for your question about "${lastMessage.content.substring(0, 30)}...". This is an interesting topic that involves several important considerations.

**Key Areas to Explore**:
1. **Technical Requirements**: Understanding what you need to accomplish
2. **Available Tools**: Leveraging existing solutions and frameworks
3. **Architecture Decisions**: Choosing the right approach for your context

**Common Patterns**:
- Start with proven solutions before building custom implementations
- Consider scalability and maintainability from the beginning
- Implement proper error handling and logging
- Use appropriate testing strategies

**Practical Tips**:
- Break complex problems into smaller, manageable pieces
- Leverage community resources and documentation
- Consider performance implications of your choices
- Plan for future extensibility and changes

I'd be happy to provide more specific guidance if you can share additional details about your particular use case or requirements.`
    ]

    return responses[Math.floor(Math.random() * responses.length)]
  }

  private generateEmbedding(text: string, dimensions: number): number[] {
    // 生成确定性的伪随机向量（基于文本内容）
    const hash = this.simpleHash(text)
    const embedding: number[] = []

    for (let i = 0; i < dimensions; i++) {
      // 使用文本哈希和索引生成确定性的随机数
      const seed = hash + i
      const random = Math.sin(seed) * 10000
      embedding.push((random - Math.floor(random)) * 2 - 1) // 归一化到 [-1, 1]
    }

    // 归一化向量（单位向量）
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    return embedding.map((val) => val / magnitude)
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash)
  }

  private estimateTokens(text: string): number {
    // 简单的 token 估算：大约 4 个字符 = 1 个 token
    return Math.ceil(text.length / 4)
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize))
    }
    return chunks
  }

  private formatStreamChunk(chunk: Record<string, unknown>): string {
    return `data: ${JSON.stringify(chunk)}\n\n`
  }

  private createOpenAIError(type: string, message: string): Error {
    const error = new Error(message) as Error & { type: string; code: string; status: number }
    error.type = type
    error.code = type
    error.status =
      type === 'rate_limit_exceeded'
        ? 429
        : type === 'invalid_api_key'
          ? 401
          : type === 'invalid_request_error'
            ? 400
            : 500
    return error
  }

  // 工具方法：生成模拟的 API 使用统计
  generateUsageStats(): {
    requests: number
    tokens: number
    cost: number
    period: string
  } {
    return {
      requests: Math.floor(Math.random() * 1000) + 100,
      tokens: Math.floor(Math.random() * 50000) + 10000,
      cost: Math.random() * 10 + 1, // $1-11
      period: 'current_month'
    }
  }

  // 工具方法：生成模拟的模型列表
  getAvailableModels(): {
    chat: Array<{ id: string; name: string; context_window: number }>
    embedding: Array<{ id: string; name: string; dimensions: number }>
  } {
    return {
      chat: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', context_window: 16384 },
        { id: 'gpt-4', name: 'GPT-4', context_window: 8192 },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', context_window: 128000 }
      ],
      embedding: [
        { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', dimensions: 384 },
        { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large', dimensions: 1536 },
        { id: 'text-embedding-ada-002', name: 'Text Embedding Ada 002', dimensions: 1536 }
      ]
    }
  }
}

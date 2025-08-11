import OpenAI from 'openai'
import type { ChatMessage, ConnectionTestResult, IPCError } from '@shared'
import { IPC_ERROR_CODES } from '@shared'

// LLM 服务配置接口
export interface LLMConfig {
  apiKey: string
  baseURL?: string
  model: string
  embeddingModel: string
  timeout?: number
  maxRetries?: number
  temperature?: number
  maxTokens?: number
}

// 聊天请求接口
export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  projectId?: string
  conversationId?: string
}

// 流式响应数据接口
export interface StreamChunk {
  id: string
  type: 'start' | 'token' | 'complete' | 'error'
  content?: string
  error?: IPCError
  metadata?: {
    model?: string
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
    }
  }
}

// 聊天响应接口
export interface ChatResponse {
  id: string
  content: string
  model: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  metadata?: Record<string, any>
}

// 嵌入请求接口
export interface EmbeddingRequest {
  texts: string[]
  model?: string
  dimensions?: number
}

// 嵌入响应接口
export interface EmbeddingResponse {
  embeddings: number[][]
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// 标题生成请求接口
export interface TitleGenerationRequest {
  messages: ChatMessage[]
  model?: string
}

// 摘要生成请求接口
export interface SummaryGenerationRequest {
  messages: ChatMessage[]
  model?: string
  maxLength?: number
}

// 重试配置
interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

// 默认重试配置
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffFactor: 2
}

/**
 * LLM 服务类
 * 负责与 OpenAI API 的集成，提供聊天、嵌入、标题生成等功能
 */
export class LLMService {
  private static instance: LLMService
  private client: OpenAI | null = null
  private config: LLMConfig | null = null
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG

  private constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService()
    }
    return LLMService.instance
  }

  /**
   * 初始化 LLM 服务
   */
  async initialize(config: LLMConfig): Promise<void> {
    try {
      this.config = { ...config }

      // Only create client if API key is provided
      if (config.apiKey) {
        this.client = new OpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          timeout: config.timeout || 30000,
          maxRetries: 0 // 我们自己处理重试
        })
        console.log('LLM Service initialized successfully with API key')
      } else {
        console.log('LLM Service initialized without API key (will be set later)')
      }
    } catch (error) {
      console.error('Failed to initialize LLM Service:', error)
      throw this.createError(
        IPC_ERROR_CODES.LLM_INVALID_CONFIG,
        'Failed to initialize LLM service',
        error
      )
    }
  }

  /**
   * 更新配置
   */
  async updateConfig(updates: Partial<LLMConfig>): Promise<void> {
    if (!this.config) {
      throw this.createError(IPC_ERROR_CODES.LLM_INVALID_CONFIG, 'LLM service not initialized')
    }

    this.config = { ...this.config, ...updates }

    // 重新创建客户端（只有在有API key时）
    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout || 30000,
        maxRetries: 0
      })
      console.log('LLM client updated with new config')
    } else {
      this.client = null
      console.log('LLM client cleared (no API key)')
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LLMConfig | null {
    return this.config ? { ...this.config } : null
  }

  /**
   * 测试 API 连接
   */
  async testConnection(config?: Partial<LLMConfig>): Promise<ConnectionTestResult> {
    const testConfig = config ? { ...this.config, ...config } : this.config

    if (!testConfig?.apiKey) {
      return {
        success: false,
        error: 'API key is required',
        details: {
          code: 'missing_api_key',
          timestamp: new Date().toISOString()
        }
      }
    }

    const startTime = Date.now()

    try {
      const testClient = new OpenAI({
        apiKey: testConfig.apiKey,
        baseURL: testConfig.baseURL,
        timeout: 10000 // 10秒超时用于测试
      })

      // 发送简单的测试请求
      await testClient.chat.completions.create({
        model: testConfig.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 1
      })

      const latency = Date.now() - startTime

      return {
        success: true,
        latency,
        details: {
          model: testConfig.model || 'gpt-3.5-turbo',
          baseURL: testConfig.baseURL || 'https://api.openai.com/v1',
          timestamp: new Date().toISOString()
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: this.parseOpenAIError(error),
        details: {
          statusCode: error.status,
          type: error.type,
          code: error.code,
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  /**
   * 发送聊天消息（非流式）
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.client || !this.config) {
      throw this.createError(IPC_ERROR_CODES.LLM_INVALID_CONFIG, 'LLM service not initialized')
    }

    const model = request.model || this.config.model
    const temperature = request.temperature ?? this.config.temperature ?? 0.7
    const maxTokens = request.maxTokens || this.config.maxTokens || 2000

    // 处理文件内容
    const processedMessages = this.processMessagesWithFiles(request.messages)

    return this.withRetry(async () => {
      const completion = await this.client!.chat.completions.create({
        model,
        messages: processedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_tokens: maxTokens
      })

      const choice = completion.choices[0]
      if (!choice?.message?.content) {
        throw this.createError(
          IPC_ERROR_CODES.LLM_API_ERROR,
          'No response content received from API'
        )
      }

      return {
        id: completion.id,
        content: choice.message.content,
        model: completion.model,
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0
        }
      }
    })
  }

  /**
   * 发送聊天消息（流式）
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    if (!this.client || !this.config) {
      throw this.createError(IPC_ERROR_CODES.LLM_INVALID_CONFIG, 'LLM service not initialized')
    }

    const model = request.model || this.config.model
    const temperature = request.temperature ?? this.config.temperature ?? 0.7
    const maxTokens = request.maxTokens || this.config.maxTokens || 2000

    // 处理文件内容
    const processedMessages = this.processMessagesWithFiles(request.messages)

    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
      // 发送开始事件
      yield {
        id: streamId,
        type: 'start',
        metadata: { model }
      }

      const stream = await this.client.chat.completions.create({
        model,
        messages: processedMessages.map((msg) => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true
      })

      let fullContent = ''
      let usage: any = null

      for await (const chunk of stream) {
        const choice = chunk.choices[0]

        if (choice?.delta?.content) {
          const content = choice.delta.content
          fullContent += content

          yield {
            id: streamId,
            type: 'token',
            content
          }
        }

        // 检查是否完成
        if (choice?.finish_reason) {
          usage = chunk.usage
          break
        }
      }

      // 发送完成事件
      yield {
        id: streamId,
        type: 'complete',
        content: fullContent,
        metadata: {
          model,
          usage: usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          }
        }
      }
    } catch (error: any) {
      yield {
        id: streamId,
        type: 'error',
        error: this.createError(IPC_ERROR_CODES.LLM_API_ERROR, this.parseOpenAIError(error), error)
      }
    }
  }

  /**
   * 生成文本嵌入
   */
  async generateEmbeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.client || !this.config) {
      throw this.createError(IPC_ERROR_CODES.LLM_INVALID_CONFIG, 'LLM service not initialized')
    }

    const model = request.model || this.config.embeddingModel

    return this.withRetry(async () => {
      const response = await this.client!.embeddings.create({
        model,
        input: request.texts,
        dimensions: request.dimensions
      })

      return {
        embeddings: response.data.map((item) => item.embedding),
        model: response.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          total_tokens: response.usage.total_tokens
        }
      }
    })
  }

  /**
   * 生成对话标题
   */
  async generateTitle(request: TitleGenerationRequest): Promise<string> {
    if (!this.client || !this.config) {
      throw this.createError(IPC_ERROR_CODES.LLM_INVALID_CONFIG, 'LLM service not initialized')
    }

    const model = request.model || this.config.model

    // 构建标题生成的提示
    const messages = [
      {
        role: 'system' as const,
        content: '请为以下对话生成一个简洁的标题（不超过20个字符）。只返回标题，不要其他内容。'
      },
      {
        role: 'user' as const,
        content: `对话内容：\n${request.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}`
      }
    ]

    return this.withRetry(async () => {
      const completion = await this.client!.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 50
      })

      const title = completion.choices[0]?.message?.content?.trim()
      if (!title) {
        throw this.createError(IPC_ERROR_CODES.LLM_API_ERROR, 'Failed to generate title')
      }

      return title
    })
  }

  /**
   * 生成对话摘要
   */
  async generateSummary(request: SummaryGenerationRequest): Promise<string> {
    if (!this.client || !this.config) {
      throw this.createError(IPC_ERROR_CODES.LLM_INVALID_CONFIG, 'LLM service not initialized')
    }

    const model = request.model || this.config.model
    const maxLength = request.maxLength || 200

    // 构建摘要生成的提示
    const messages = [
      {
        role: 'system' as const,
        content: `请为以下对话生成一个简洁的摘要（不超过${maxLength}个字符）。摘要应该包含主要讨论点和结论。`
      },
      {
        role: 'user' as const,
        content: `对话内容：\n${request.messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}`
      }
    ]

    return this.withRetry(async () => {
      const completion = await this.client!.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: Math.ceil(maxLength / 2) // 估算 token 数量
      })

      const summary = completion.choices[0]?.message?.content?.trim()
      if (!summary) {
        throw this.createError(IPC_ERROR_CODES.LLM_API_ERROR, 'Failed to generate summary')
      }

      return summary
    })
  }

  /**
   * 处理包含文件的消息
   */
  private processMessagesWithFiles(messages: ChatMessage[]): ChatMessage[] {
    return messages.map((message) => {
      if (!message.files || message.files.length === 0) {
        return message
      }

      // 将文件内容添加到消息内容中
      const fileContents = message.files
        .map((file) => `\n\n--- 文件: ${file.name} ---\n${file.content}\n--- 文件结束 ---`)
        .join('')

      return {
        ...message,
        content: message.content + fileContents
      }
    })
  }

  /**
   * 带重试的操作执行
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error: any) {
        lastError = error

        // 检查是否应该重试
        if (!this.shouldRetry(error, attempt)) {
          break
        }

        // 计算延迟时间（指数退避）
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        )

        console.warn(
          `LLM API request failed (attempt ${attempt + 1}), retrying in ${delay}ms:`,
          error.message
        )

        // 等待后重试
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    // 所有重试都失败了
    throw this.createError(
      IPC_ERROR_CODES.LLM_API_ERROR,
      `LLM API request failed after ${this.retryConfig.maxRetries + 1} attempts`,
      lastError
    )
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: any, attempt: number): boolean {
    // 已达到最大重试次数
    if (attempt >= this.retryConfig.maxRetries) {
      return false
    }

    // 检查错误类型
    const status = error.status || error.statusCode

    // 可重试的错误类型
    const retryableStatuses = [429, 500, 502, 503, 504]
    const retryableTypes = ['rate_limit_exceeded', 'server_error', 'timeout']

    return (
      retryableStatuses.includes(status) ||
      retryableTypes.includes(error.type) ||
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT'
    )
  }

  /**
   * 解析 OpenAI 错误
   */
  private parseOpenAIError(error: any): string {
    if (error.status === 401) {
      return 'Invalid API key or authentication failed'
    }
    if (error.status === 429) {
      return 'Rate limit exceeded. Please try again later'
    }
    if (error.status === 500) {
      return 'OpenAI server error. Please try again later'
    }
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return 'Network connection error. Please check your internet connection'
    }

    return error.message || 'Unknown API error'
  }

  /**
   * 创建标准化错误
   */
  private createError(code: string, message: string, details?: any): IPCError {
    return {
      code,
      message,
      details,
      stack: new Error().stack
    }
  }

  /**
   * 销毁服务实例
   */
  destroy(): void {
    this.client = null
    this.config = null
  }
}

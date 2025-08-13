import type {
  AIModel,
  AIMessage,
  AIMessageContent,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig,
  OpenAIConfig,
  TokenUsage
} from '../../shared/types/ai'
import { BaseAIModel, AIProvider, AIAPIError } from './base'
import { AI_MODELS } from '../../shared/constants/ai'

/**
 * OpenAI Model Implementation
 * Provides integration with OpenAI's GPT models including GPT-4, GPT-4-turbo, GPT-4o, and GPT-3.5-turbo
 * Supports streaming responses, multimodal inputs, and comprehensive error handling
 */

/**
 * OpenAI API Types
 * Internal types for OpenAI API communication
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | OpenAIContentPart[]
  name?: string
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
    detail?: 'low' | 'high' | 'auto'
  }
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: 'assistant'
      content: string | null
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

interface OpenAIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: 'assistant'
      content?: string
      tool_calls?: Array<{
        index: number
        id?: string
        type?: 'function'
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * OpenAI Model Implementation Class
 * Extends BaseAIModel with OpenAI-specific functionality
 */
export class OpenAIModel extends BaseAIModel {
  private readonly openaiConfig: OpenAIConfig
  private readonly baseURL: string

  constructor(config: OpenAIConfig, capabilities: ModelCapabilities) {
    super(config, capabilities)
    this.openaiConfig = config
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
  }

  /**
   * Sends a chat completion request to OpenAI API
   * Handles multimodal content and returns a complete response
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      // Validate messages
      this.validateMessages(messages)

      // Convert to OpenAI format
      const openaiMessages = this.convertToOpenAIMessages(messages)

      // Prepare request body
      const requestBody = {
        model: this.config.model,
        messages: openaiMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stream: false,
        ...(this.openaiConfig.seed && { seed: this.openaiConfig.seed }),
        ...(this.openaiConfig.logitBias && { logit_bias: this.openaiConfig.logitBias }),
        ...(this.openaiConfig.stop && { stop: this.openaiConfig.stop }),
        ...(this.openaiConfig.user && { user: this.openaiConfig.user })
      }

      // Make API request
      const response = await this.makeAPIRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const data: OpenAIResponse = await response.json()

      // Convert response to standard format
      return this.convertOpenAIResponse(data)
    } catch (error) {
      throw this.handleAPIError(error, 'chat completion')
    }
  }

  /**
   * Streams a chat completion response from OpenAI API
   * Handles Server-Sent Events and yields chunks in real-time
   */
  async *stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk> {
    try {
      // Validate messages
      this.validateMessages(messages)

      // Convert to OpenAI format
      const openaiMessages = this.convertToOpenAIMessages(messages)

      // Prepare request body for streaming
      const requestBody = {
        model: this.config.model,
        messages: openaiMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stream: true,
        ...(this.openaiConfig.seed && { seed: this.openaiConfig.seed }),
        ...(this.openaiConfig.logitBias && { logit_bias: this.openaiConfig.logitBias }),
        ...(this.openaiConfig.stop && { stop: this.openaiConfig.stop }),
        ...(this.openaiConfig.user && { user: this.openaiConfig.user })
      }

      // Make streaming API request
      const response = await this.makeAPIRequest('/chat/completions', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      if (!response.body) {
        throw new Error('No response body for streaming')
      }

      // Process streaming response
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let totalUsage: TokenUsage | undefined

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            // Yield final chunk with usage if available
            if (totalUsage) {
              yield {
                content: '',
                finished: true,
                usage: totalUsage
              }
            } else {
              yield { content: '', finished: true }
            }
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmedLine = line.trim()

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith(':')) {
              continue
            }

            // Parse Server-Sent Event
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6)

              // Check for stream end
              if (data === '[DONE]') {
                yield { content: '', finished: true }
                return
              }

              try {
                const chunk: OpenAIStreamChunk = JSON.parse(data)
                const convertedChunk = this.convertOpenAIStreamChunk(chunk)

                if (convertedChunk) {
                  // Store usage information for final chunk
                  if (chunk.usage) {
                    totalUsage = {
                      promptTokens: chunk.usage.prompt_tokens,
                      completionTokens: chunk.usage.completion_tokens,
                      totalTokens: chunk.usage.total_tokens
                    }
                  }

                  yield convertedChunk
                }
              } catch (parseError) {
                console.warn('Failed to parse streaming chunk:', parseError)
                continue
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      throw this.handleAPIError(error, 'streaming chat completion')
    }
  }

  /**
   * Converts AIMessage array to OpenAI API format
   * Handles multimodal content including images and tool calls
   */
  private convertToOpenAIMessages(messages: AIMessage[]): OpenAIMessage[] {
    return messages.map((message) => {
      const openaiMessage: OpenAIMessage = {
        role: message.role,
        content: this.convertContentToOpenAI(message.content)
      }

      return openaiMessage
    })
  }

  /**
   * Converts message content to OpenAI format
   * Handles text and image content parts
   */
  private convertContentToOpenAI(
    content: string | AIMessageContent[]
  ): string | OpenAIContentPart[] {
    if (typeof content === 'string') {
      return content
    }

    // Handle multimodal content
    const openaiContent: OpenAIContentPart[] = []

    for (const part of content) {
      switch (part.type) {
        case 'text':
          if (part.text) {
            openaiContent.push({
              type: 'text',
              text: part.text
            })
          }
          break

        case 'image':
          if (part.image) {
            openaiContent.push({
              type: 'image_url',
              image_url: {
                url: part.image.url,
                detail: this.getImageDetail(part.image.url)
              }
            })
          }
          break

        default:
          // Convert other types to text representation
          if (part.text) {
            openaiContent.push({
              type: 'text',
              text: part.text
            })
          }
      }
    }

    return openaiContent.length > 0 ? openaiContent : [{ type: 'text', text: '' }]
  }

  /**
   * Determines image detail level based on image size/type
   * Optimizes API usage and response quality
   */
  private getImageDetail(imageUrl: string): 'low' | 'high' | 'auto' {
    // For Base64 images, use auto to let OpenAI decide
    if (imageUrl.startsWith('data:')) {
      return 'auto'
    }

    // For regular URLs, default to high quality
    return 'high'
  }

  /**
   * Converts OpenAI API response to standard AIResponse format
   */
  private convertOpenAIResponse(response: OpenAIResponse): AIResponse {
    const choice = response.choices[0]

    if (!choice) {
      throw new Error('No choices in OpenAI response')
    }

    const message = choice.message
    const aiResponse: AIResponse = {
      content: message.content || ''
    }

    // Add usage information
    if (response.usage) {
      aiResponse.usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens
      }
    }

    // Add tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      aiResponse.toolCalls = message.tool_calls.map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: this.parseToolArguments(toolCall.function.arguments)
      }))
    }

    return aiResponse
  }

  /**
   * Converts OpenAI streaming chunk to standard format
   */
  private convertOpenAIStreamChunk(chunk: OpenAIStreamChunk): AIStreamChunk | null {
    const choice = chunk.choices[0]

    if (!choice) {
      return null
    }

    const delta = choice.delta
    const streamChunk: AIStreamChunk = {
      finished: choice.finish_reason !== null && choice.finish_reason !== undefined
    }

    // Add content if present
    if (delta.content) {
      streamChunk.content = delta.content
    }

    // Add tool calls if present
    if (delta.tool_calls && delta.tool_calls.length > 0) {
      const toolCall = delta.tool_calls[0]
      if (toolCall && toolCall.function?.name && toolCall.function?.arguments) {
        streamChunk.toolCall = {
          id: toolCall.id || '',
          name: toolCall.function.name,
          arguments: this.parseToolArguments(toolCall.function.arguments)
        }
      }
    }

    return streamChunk
  }

  /**
   * Safely parses tool call arguments from JSON string
   */
  private parseToolArguments(argumentsString: string): Record<string, unknown> {
    try {
      return JSON.parse(argumentsString)
    } catch {
      return { raw: argumentsString }
    }
  }

  /**
   * Makes an HTTP request to the OpenAI API with proper headers and error handling
   */
  private async makeAPIRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.config.apiKey}`
    }

    // Add organization header if provided
    if (this.openaiConfig.organization) {
      headers['OpenAI-Organization'] = this.openaiConfig.organization
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    }

    // Implement retry logic with exponential backoff
    const maxRetries = 3
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
        const response = await fetch(url, requestOptions)

        // Check for successful response
        if (response.ok) {
          return response
        }

        // Handle specific error status codes
        if (response.status === 401) {
          throw new AIAPIError('Invalid API key or unauthorized access', response.status)
        }

        if (response.status === 429) {
          // Rate limit - implement exponential backoff
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
            await this.sleep(delay)
            attempt++
            continue
          }
          throw new AIAPIError('Rate limit exceeded. Please try again later', response.status)
        }

        if (response.status === 503) {
          // Service unavailable - retry with backoff
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000
            await this.sleep(delay)
            attempt++
            continue
          }
          throw new AIAPIError('OpenAI service is temporarily unavailable', response.status)
        }

        // Parse error response
        let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.error?.message) {
            errorMessage = errorData.error.message
          }
        } catch {
          // Ignore JSON parsing errors
        }

        throw new AIAPIError(errorMessage, response.status)
      } catch (error) {
        if (error instanceof AIAPIError) {
          throw error
        }

        // Network errors - retry with backoff
        if (attempt < maxRetries && this.isRetryableError(error)) {
          const delay = Math.pow(2, attempt) * 1000
          await this.sleep(delay)
          attempt++
          continue
        }

        throw new AIAPIError(
          `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          0
        )
      }
    }

    throw new AIAPIError('Max retries exceeded', 0)
  }

  /**
   * Checks if an error is retryable (network errors, timeouts, etc.)
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('fetch')
      )
    }
    return false
  }

  /**
   * Utility function to sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * OpenAI Provider Implementation
 * Handles provider registration and model creation
 */
export const OpenAIProvider: AIProvider = {
  name: 'openai',
  displayName: 'OpenAI',

  /**
   * Creates an OpenAI model instance with the given configuration
   */
  async createModel(config: AIConfig): Promise<AIModel> {
    const openaiConfig = config as OpenAIConfig
    const capabilities = this.getModelCapabilities(config.model)
    return new OpenAIModel(openaiConfig, capabilities)
  },

  /**
   * Validates OpenAI configuration
   */
  validateConfig(config: AIConfig): boolean {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false
    }

    if (!config.model || config.model.trim().length === 0) {
      return false
    }

    // If using a custom base URL (not the default OpenAI API), allow any model name
    const isCustomAPI = config.baseURL && !config.baseURL.includes('api.openai.com')
    if (isCustomAPI) {
      return true
    }

    // For official OpenAI API, check against supported models
    const supportedModels = this.getSupportedModels()
    if (!supportedModels.includes(config.model)) {
      return false
    }

    return true
  },

  /**
   * Gets default OpenAI configuration
   */
  getDefaultConfig(): Partial<AIConfig> {
    return {
      baseURL: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0
    }
  },

  /**
   * Lists all supported OpenAI models
   */
  getSupportedModels(): string[] {
    const openaiModels = AI_MODELS.OPENAI
    return openaiModels ? Object.keys(openaiModels) : []
  },

  /**
   * Gets model capabilities for a specific OpenAI model
   */
  getModelCapabilities(modelName: string): ModelCapabilities {
    const openaiModels = AI_MODELS.OPENAI
    if (!openaiModels) {
      return {
        supportVision: false,
        supportReasoning: false,
        supportToolCalls: true,
        maxContextLength: 4096
      }
    }

    const modelInfo = openaiModels[modelName as keyof typeof openaiModels]

    if (modelInfo) {
      return {
        supportVision: modelInfo.capabilities.supportVision,
        supportReasoning: modelInfo.capabilities.supportReasoning,
        supportToolCalls: modelInfo.capabilities.supportToolCalls,
        maxContextLength: modelInfo.capabilities.maxContextLength
      }
    }

    // Default capabilities for unknown models
    return {
      supportVision: false,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 4096
    }
  }
}

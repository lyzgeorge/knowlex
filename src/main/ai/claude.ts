import type {
  AIModel,
  AIMessage,
  AIMessageContent,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig,
  ClaudeConfig,
  ToolCall,
  TokenUsage
} from '../../shared/types/ai'
import { BaseAIModel, AIProvider, AIAPIError } from './base'
import { AI_MODELS } from '../../shared/constants/ai'
import type { CancellationToken } from '../utils/cancellation'

/**
 * Claude Model Implementation
 * Provides integration with Anthropic's Claude models including Claude-3-opus, Claude-3-sonnet, and Claude-3-haiku
 * Supports reasoning content, tool calling, streaming responses, and multimodal inputs
 */

/**
 * Anthropic API Types
 * Internal types for Anthropic API communication
 */
interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | ClaudeContentPart[]
}

interface ClaudeContentPart {
  type: 'text' | 'image'
  text?: string
  source?: {
    type: 'base64'
    media_type: string
    data: string
  }
}

interface ClaudeSystemMessage {
  type: 'text'
  text: string
}

// Tool-related interfaces for future use
// interface ClaudeToolDefinition {
//   name: string
//   description: string
//   input_schema: Record<string, unknown>
// }

// interface ClaudeToolUse {
//   type: 'tool_use'
//   id: string
//   name: string
//   input: Record<string, unknown>
// }

// interface ClaudeToolResult {
//   type: 'tool_result'
//   tool_use_id: string
//   content: string
//   is_error?: boolean
// }

interface ClaudeResponse {
  id: string
  type: 'message'
  role: 'assistant'
  content: Array<{
    type: 'text' | 'tool_use'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }>
  model: string
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use'
  stop_sequence?: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

interface ClaudeStreamEvent {
  type:
    | 'message_start'
    | 'content_block_start'
    | 'content_block_delta'
    | 'content_block_stop'
    | 'message_delta'
    | 'message_stop'
  message?: {
    id: string
    type: 'message'
    role: 'assistant'
    content: Array<unknown>
    model: string
    stop_reason?: string
    stop_sequence?: string
    usage: {
      input_tokens: number
      output_tokens: number
    }
  }
  content_block?: {
    type: 'text' | 'tool_use'
    text?: string
    id?: string
    name?: string
    input?: Record<string, unknown>
  }
  delta?: {
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
  usage?: {
    output_tokens: number
  }
}

/**
 * Claude Model Implementation Class
 * Extends BaseAIModel with Claude-specific functionality
 */
export class ClaudeModel extends BaseAIModel {
  private readonly claudeConfig: ClaudeConfig
  private readonly baseURL: string
  private readonly apiVersion: string

  constructor(config: ClaudeConfig, capabilities: ModelCapabilities) {
    super(config, capabilities)
    this.claudeConfig = config
    this.baseURL = config.baseURL || 'https://api.anthropic.com'
    this.apiVersion = config.anthropicVersion || '2023-06-01'
  }

  /**
   * Sends a chat completion request to Anthropic API
   * Handles multimodal content, reasoning, and tool calling
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      // Validate messages
      this.validateMessages(messages)

      // Convert to Claude format
      const { system, claudeMessages } = this.convertToClaudeMessages(messages)

      // Prepare request body
      const requestBody: Record<string, unknown> = {
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4000,
        messages: claudeMessages,
        stream: false
      }

      // Add system message if present
      if (system) {
        requestBody.system = system
      }

      // Add optional parameters
      if (this.config.temperature !== undefined) {
        requestBody.temperature = this.config.temperature
      }

      if (this.config.topP !== undefined) {
        requestBody.top_p = this.config.topP
      }

      if (this.claudeConfig.stopSequences) {
        requestBody.stop_sequences = this.claudeConfig.stopSequences
      }

      if (this.claudeConfig.metadata) {
        requestBody.metadata = this.claudeConfig.metadata
      }

      // Make API request
      const response = await this.makeAPIRequest('/v1/messages', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const data: ClaudeResponse = await response.json()

      // Convert response to standard format
      return this.convertClaudeResponse(data)
    } catch (error) {
      throw this.handleAPIError(error, 'chat completion')
    }
  }

  /**
   * Streams a chat completion response from Anthropic API
   * Handles Server-Sent Events and yields chunks in real-time
   */
  async *stream(
    messages: AIMessage[],
    cancellationToken?: CancellationToken
  ): AsyncIterable<AIStreamChunk> {
    try {
      // Validate messages
      this.validateMessages(messages)

      // Convert to Claude format
      const { system, claudeMessages } = this.convertToClaudeMessages(messages)

      // Prepare request body for streaming
      const requestBody: Record<string, unknown> = {
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4000,
        messages: claudeMessages,
        stream: true
      }

      // Add system message if present
      if (system) {
        requestBody.system = system
      }

      // Add optional parameters
      if (this.config.temperature !== undefined) {
        requestBody.temperature = this.config.temperature
      }

      if (this.config.topP !== undefined) {
        requestBody.top_p = this.config.topP
      }

      if (this.claudeConfig.stopSequences) {
        requestBody.stop_sequences = this.claudeConfig.stopSequences
      }

      if (this.claudeConfig.metadata) {
        requestBody.metadata = this.claudeConfig.metadata
      }

      // Make streaming API request
      const response = await this.makeAPIRequest('/v1/messages', {
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
          // Check for cancellation before each read
          if (cancellationToken?.isCancelled) {
            console.log('Claude streaming cancelled by user')
            yield { content: '', finished: true }
            break
          }

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

              try {
                const event: ClaudeStreamEvent = JSON.parse(data)
                const convertedChunk = this.convertClaudeStreamEvent(event)

                if (convertedChunk) {
                  // Store usage information for final chunk
                  if (event.message?.usage) {
                    totalUsage = {
                      promptTokens: event.message.usage.input_tokens,
                      completionTokens: event.message.usage.output_tokens,
                      totalTokens:
                        event.message.usage.input_tokens + event.message.usage.output_tokens
                    }
                  }

                  yield convertedChunk
                }
              } catch (parseError) {
                console.warn('Failed to parse Claude streaming event:', parseError)
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
   * Converts AIMessage array to Claude API format
   * Separates system messages and handles multimodal content
   */
  private convertToClaudeMessages(messages: AIMessage[]): {
    system: ClaudeSystemMessage[] | undefined
    claudeMessages: ClaudeMessage[]
  } {
    const systemMessages: ClaudeSystemMessage[] = []
    const claudeMessages: ClaudeMessage[] = []

    for (const message of messages) {
      if (message.role === 'system') {
        // Extract system message content
        const systemContent = this.extractTextContent(message.content)
        if (systemContent) {
          systemMessages.push({
            type: 'text',
            text: systemContent
          })
        }
      } else if (message.role === 'user' || message.role === 'assistant') {
        claudeMessages.push({
          role: message.role,
          content: this.convertContentToClaude(message.content)
        })
      }
    }

    return {
      system: systemMessages.length > 0 ? systemMessages : undefined,
      claudeMessages
    }
  }

  /**
   * Converts message content to Claude format
   * Handles text and image content parts
   */
  private convertContentToClaude(
    content: string | AIMessageContent[]
  ): string | ClaudeContentPart[] {
    if (typeof content === 'string') {
      return content
    }

    // Handle multimodal content
    const claudeContent: ClaudeContentPart[] = []

    for (const part of content) {
      switch (part.type) {
        case 'text':
          if (part.text) {
            claudeContent.push({
              type: 'text',
              text: part.text
            })
          }
          break

        case 'image':
          if (part.image) {
            // Convert image to Claude format
            const imageData = this.processImageForClaude(part.image.url, part.image.mimeType)
            if (imageData) {
              claudeContent.push({
                type: 'image',
                source: imageData
              })
            }
          }
          break

        default:
          // Convert other types to text representation
          if (part.text) {
            claudeContent.push({
              type: 'text',
              text: part.text
            })
          }
      }
    }

    return claudeContent.length > 0 ? claudeContent : [{ type: 'text', text: '' }]
  }

  /**
   * Processes image data for Claude API format
   * Handles Base64 encoding and media type validation
   */
  private processImageForClaude(
    imageUrl: string,
    mimeType: string
  ): {
    type: 'base64'
    media_type: string
    data: string
  } | null {
    try {
      // Handle Base64 data URLs
      if (imageUrl.startsWith('data:')) {
        const parts = imageUrl.split(',')
        if (parts.length !== 2) {
          console.warn('Invalid data URL format')
          return null
        }

        const [header, data] = parts
        if (!header || !data) {
          console.warn('Invalid data URL parts')
          return null
        }

        const mediaTypeMatch = header.match(/data:([^;]+)/)
        const mediaType = mediaTypeMatch?.[1] || mimeType

        // Validate supported image formats
        if (!this.isSupportedImageFormat(mediaType)) {
          console.warn(`Unsupported image format for Claude: ${mediaType}`)
          return null
        }

        return {
          type: 'base64',
          media_type: mediaType,
          data: data
        }
      }

      // For other URL types, we would need to fetch and convert
      // For now, return null as we can't process external URLs directly
      console.warn('External image URLs not supported for Claude integration')
      return null
    } catch (error) {
      console.error('Failed to process image for Claude:', error)
      return null
    }
  }

  /**
   * Checks if an image format is supported by Claude
   */
  private isSupportedImageFormat(mimeType: string): boolean {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    return supportedFormats.includes(mimeType.toLowerCase())
  }

  /**
   * Extracts text content from multimodal message content
   */
  private extractTextContent(content: string | AIMessageContent[]): string {
    if (typeof content === 'string') {
      return content
    }

    return content
      .filter((part) => part.type === 'text' && part.text)
      .map((part) => part.text)
      .join('\n')
  }

  /**
   * Converts Claude API response to standard AIResponse format
   */
  private convertClaudeResponse(response: ClaudeResponse): AIResponse {
    const aiResponse: AIResponse = {
      content: ''
    }

    // Extract content from response
    const textContent: string[] = []
    const toolCalls: ToolCall[] = []

    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        textContent.push(block.text)
      } else if (block.type === 'tool_use' && block.id && block.name && block.input) {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input
        })
      }
    }

    aiResponse.content = textContent.join('\n')

    // Add tool calls if present
    if (toolCalls.length > 0) {
      aiResponse.toolCalls = toolCalls
    }

    // Add usage information
    if (response.usage) {
      aiResponse.usage = {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens
      }
    }

    // Check for reasoning content (Claude models may include this in text)
    if (this.capabilities.supportReasoning && aiResponse.content) {
      const reasoningMatch = aiResponse.content.match(/<thinking>([\s\S]*?)<\/thinking>/)
      if (reasoningMatch) {
        aiResponse.reasoning = reasoningMatch[1].trim()
        // Remove reasoning from main content
        aiResponse.content = aiResponse.content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
      }
    }

    return aiResponse
  }

  /**
   * Converts Claude streaming event to standard format
   */
  private convertClaudeStreamEvent(event: ClaudeStreamEvent): AIStreamChunk | null {
    switch (event.type) {
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta' && event.delta.text) {
          return {
            content: event.delta.text,
            finished: false
          }
        }
        break

      case 'content_block_start':
        if (
          event.content_block?.type === 'tool_use' &&
          event.content_block.id &&
          event.content_block.name
        ) {
          return {
            toolCall: {
              id: event.content_block.id,
              name: event.content_block.name,
              arguments: event.content_block.input || {}
            },
            finished: false
          }
        }
        break

      case 'message_stop':
        return {
          content: '',
          finished: true
        }

      default:
        return null
    }

    return null
  }

  /**
   * Checks if the model supports vision capabilities
   */
  isSupportVision(): boolean {
    return this.capabilities.supportVision
  }

  /**
   * Checks if the model supports reasoning content
   */
  isSupportReasoning(): boolean {
    return this.capabilities.supportReasoning
  }

  /**
   * Checks if the model supports tool calling
   */
  isSupportToolCalls(): boolean {
    return this.capabilities.supportToolCalls
  }

  /**
   * Makes an HTTP request to the Anthropic API with proper headers and error handling
   */
  private async makeAPIRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': this.apiVersion
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
          throw new AIAPIError('Claude service is temporarily unavailable', response.status)
        }

        // Parse error response
        let errorMessage = `Anthropic API error: ${response.status} ${response.statusText}`
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
 * Claude Provider Implementation
 * Handles provider registration and model creation
 */
export const ClaudeProvider: AIProvider = {
  name: 'claude',
  displayName: 'Claude (Anthropic)',

  /**
   * Creates a Claude model instance with the given configuration
   */
  async createModel(config: AIConfig): Promise<AIModel> {
    const claudeConfig = config as ClaudeConfig
    const capabilities = this.getModelCapabilities(config.model)
    return new ClaudeModel(claudeConfig, capabilities)
  },

  /**
   * Validates Claude configuration
   */
  validateConfig(config: AIConfig): boolean {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      return false
    }

    if (!config.model || config.model.trim().length === 0) {
      return false
    }

    // Check if model is supported
    const supportedModels = this.getSupportedModels()
    if (!supportedModels.includes(config.model)) {
      return false
    }

    return true
  },

  /**
   * Gets default Claude configuration
   */
  getDefaultConfig(): Partial<AIConfig> {
    return {
      baseURL: 'https://api.anthropic.com',
      model: 'claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 4000,
      topP: 1
    }
  },

  /**
   * Lists all supported Claude models
   */
  getSupportedModels(): string[] {
    const claudeModels = AI_MODELS.CLAUDE
    return claudeModels ? Object.keys(claudeModels) : []
  },

  /**
   * Gets model capabilities for a specific Claude model
   */
  getModelCapabilities(modelName: string): ModelCapabilities {
    const claudeModels = AI_MODELS.CLAUDE
    if (!claudeModels) {
      return {
        supportVision: true,
        supportReasoning: true,
        supportToolCalls: true,
        maxContextLength: 200000
      }
    }

    const modelInfo = claudeModels[modelName as keyof typeof claudeModels]

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
      supportVision: true,
      supportReasoning: true,
      supportToolCalls: true,
      maxContextLength: 200000
    }
  }
}

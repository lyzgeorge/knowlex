import type {
  AIModel,
  AIMessage,
  AIMessageContent,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig
} from '../../shared/types/ai'
import type { Message, MessageContent, MessageContentPart } from '../../shared/types/message'

/**
 * AI Model Base Implementation
 * Provides common functionality and abstractions for all AI model implementations
 * Handles message format conversion, validation, and error handling
 */

/**
 * Abstract base class for AI model implementations
 * Enforces consistent interface and provides common utilities
 */
export abstract class BaseAIModel implements AIModel {
  protected config: AIConfig
  protected capabilities: ModelCapabilities

  constructor(config: AIConfig, capabilities: ModelCapabilities) {
    this.validateConfig(config)
    this.config = config
    this.capabilities = capabilities
  }

  /**
   * Validates AI configuration before use
   * Ensures required fields are present and valid
   */
  protected validateConfig(config: AIConfig): void {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new Error('API key is required')
    }

    if (!config.model || config.model.trim().length === 0) {
      throw new Error('Model name is required')
    }

    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        throw new Error('Temperature must be between 0 and 2')
      }
    }

    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 1 || config.maxTokens > 100000) {
        throw new Error('Max tokens must be between 1 and 100000')
      }
    }

    if (config.topP !== undefined) {
      if (config.topP < 0 || config.topP > 1) {
        throw new Error('Top P must be between 0 and 1')
      }
    }
  }

  /**
   * Converts internal Message format to AI-compatible format
   * Handles multimodal content and maintains message structure
   */
  protected convertMessagesToAI(messages: Message[]): AIMessage[] {
    return messages.map((message) => this.convertMessageToAI(message))
  }

  /**
   * Converts a single internal Message to AI format
   * Handles role mapping and content structure conversion
   */
  protected convertMessageToAI(message: Message): AIMessage {
    const aiMessage: AIMessage = {
      role: message.role === 'user' ? 'user' : 'assistant',
      content: this.convertContentToAI(message.content)
    }

    return aiMessage
  }

  /**
   * Converts MessageContent to AI-compatible format
   * Handles text, image, and other content types
   */
  protected convertContentToAI(content: MessageContent): string | AIMessageContent[] {
    // Simple text message case
    if (content.length === 1 && content[0]?.type === 'text' && content[0]?.text) {
      return content[0].text
    }

    // Multimodal content case
    const aiContent: AIMessageContent[] = []

    for (const part of content) {
      switch (part.type) {
        case 'text':
          if (part.text) {
            aiContent.push({
              type: 'text',
              text: part.text
            })
          }
          break

        case 'image':
          if (part.image) {
            aiContent.push({
              type: 'image',
              image: {
                url: part.image.url,
                mimeType: part.image.mimeType
              }
            })
          }
          break

        case 'citation':
          // Convert citation to text representation for AI processing
          if (part.citation) {
            aiContent.push({
              type: 'text',
              text: `[Citation: ${part.citation.filename}]\n${part.citation.content}`
            })
          }
          break

        case 'tool-call':
          // Tool calls are typically handled separately in the AI flow
          // For now, include as text description
          if (part.toolCall) {
            aiContent.push({
              type: 'text',
              text: `[Tool Call: ${part.toolCall.name}]`
            })
          }
          break

        default:
          console.warn(`Unknown content type: ${part.type}`)
      }
    }

    return aiContent.length > 0 ? aiContent : [{ type: 'text', text: '' }]
  }

  /**
   * Converts AI response back to internal MessageContent format
   * Creates proper MessageContentPart structures
   */
  protected convertResponseToMessageContent(response: AIResponse): MessageContent {
    const content: MessageContentPart[] = []

    // Add main text content
    if (response.content) {
      content.push({
        type: 'text',
        text: response.content
      })
    }

    // Add reasoning content if available
    if (response.reasoning) {
      content.push({
        type: 'text',
        text: `[Reasoning]\n${response.reasoning}`
      })
    }

    // Add tool calls if available
    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        content.push({
          type: 'tool-call',
          toolCall: {
            id: toolCall.id,
            name: toolCall.name,
            arguments: toolCall.arguments
          }
        })
      }
    }

    return content.length > 0 ? content : [{ type: 'text', text: '' }]
  }

  /**
   * Validates messages before sending to AI
   * Checks for empty content, invalid roles, etc.
   */
  protected validateMessages(messages: AIMessage[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required')
    }

    for (const message of messages) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`)
      }

      if (!message.content) {
        throw new Error('Message content is required')
      }

      // Validate content based on type
      if (typeof message.content === 'string') {
        if (message.content.trim().length === 0) {
          throw new Error('Text content cannot be empty')
        }
      } else if (Array.isArray(message.content)) {
        if (message.content.length === 0) {
          throw new Error('Content array cannot be empty')
        }

        for (const part of message.content) {
          if (part.type === 'text' && (!part.text || part.text.trim().length === 0)) {
            throw new Error('Text content cannot be empty')
          }
          if (part.type === 'image' && !part.image?.url) {
            throw new Error('Image content must have a valid URL')
          }
        }
      }
    }
  }

  /**
   * Handles common API errors and provides meaningful error messages
   * Wraps provider-specific errors in a consistent format
   */
  protected handleAPIError(error: unknown, context: string): Error {
    console.error(`AI API Error in ${context}:`, error)

    if (error instanceof Error) {
      // Check for common error patterns
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        return new Error('Invalid API key or unauthorized access')
      }
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return new Error('Rate limit exceeded. Please try again later')
      }
      if (error.message.includes('400') || error.message.includes('bad request')) {
        return new Error('Invalid request. Please check your input')
      }
      if (error.message.includes('503') || error.message.includes('service unavailable')) {
        return new Error('AI service is temporarily unavailable')
      }

      return new Error(`AI API Error: ${error.message}`)
    }

    return new Error(`Unknown AI API error in ${context}`)
  }

  /**
   * Gets model capabilities
   * Returns the capabilities defined for this model instance
   */
  getCapabilities(): ModelCapabilities {
    return { ...this.capabilities }
  }

  /**
   * Gets current model configuration
   * Returns a copy of the configuration to prevent mutation
   */
  getConfig(): AIConfig {
    return { ...this.config }
  }

  /**
   * Updates model configuration
   * Validates new configuration before applying
   */
  updateConfig(newConfig: Partial<AIConfig>): void {
    const updatedConfig = { ...this.config, ...newConfig }
    this.validateConfig(updatedConfig)
    this.config = updatedConfig
  }

  // Abstract methods that must be implemented by concrete classes
  abstract chat(messages: AIMessage[]): Promise<AIResponse>
  abstract stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk>
}

/**
 * AI Provider Registry Type
 * Defines the structure for registering AI model providers
 */
export interface AIProvider {
  name: string
  displayName: string
  createModel: (config: AIConfig) => Promise<AIModel>
  validateConfig: (config: AIConfig) => boolean
  getDefaultConfig: () => Partial<AIConfig>
  getSupportedModels: () => string[]
  getModelCapabilities: (modelName: string) => ModelCapabilities
}

/**
 * Error types for AI operations
 * Provides specific error types for better error handling
 */
export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIConfigurationError'
  }
}

export class AIValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIValidationError'
  }
}

export class AIAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AIAPIError'
  }
}

/**
 * Utility functions for AI message handling
 */
export const AIUtils = {
  /**
   * Creates a system message with the given content
   */
  createSystemMessage: (content: string): AIMessage => ({
    role: 'system',
    content: content.trim()
  }),

  /**
   * Creates a user message with the given content
   */
  createUserMessage: (content: string): AIMessage => ({
    role: 'user',
    content: content.trim()
  }),

  /**
   * Creates an assistant message with the given content
   */
  createAssistantMessage: (content: string): AIMessage => ({
    role: 'assistant',
    content: content.trim()
  }),

  /**
   * Estimates token count for a message (rough approximation)
   */
  estimateTokenCount: (content: string): number => {
    // Rough estimation: ~4 characters per token
    return Math.ceil(content.length / 4)
  },

  /**
   * Checks if content exceeds context length
   */
  exceedsContextLength: (messages: AIMessage[], maxLength: number): boolean => {
    const totalTokens = messages.reduce((sum, message) => {
      const content =
        typeof message.content === 'string'
          ? message.content
          : message.content.map((part) => part.text || '').join(' ')
      return sum + AIUtils.estimateTokenCount(content)
    }, 0)

    return totalTokens > maxLength
  }
}

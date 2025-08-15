import {
  generateText,
  streamText,
  type CoreMessage,
  type LanguageModel,
  type GenerateTextResult
} from 'ai'
import { openai, createOpenAI } from '@ai-sdk/openai'
import { anthropic, createAnthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type {
  AIModel,
  AIMessage,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig
} from '../../shared/types/ai'
import type { CancellationToken } from '../utils/cancellation'

/**
 * Vercel AI SDK Integration
 * Provides unified interface to multiple AI providers using Vercel's AI SDK
 * Supports OpenAI, Anthropic Claude, and Google Gemini models
 */

/**
 * Supported AI providers configuration
 */
export interface VercelAIConfig extends AIConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  customBaseURL?: string
}

/**
 * Provider mapping for different AI services
 */
class VercelAIProvider {
  private models: Map<string, LanguageModel> = new Map()

  /**
   * Gets a language model instance for the specified configuration
   */
  getModel(config: VercelAIConfig): LanguageModel {
    const cacheKey = `${config.provider}-${config.model}-${config.apiKey.substring(0, 8)}`

    if (this.models.has(cacheKey)) {
      return this.models.get(cacheKey)!
    }

    let model: LanguageModel

    switch (config.provider) {
      case 'openai': {
        if (config.baseURL && !config.baseURL.includes('api.openai.com')) {
          // Custom OpenAI-compatible API
          const customClient = createOpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseURL
          })
          model = customClient(config.model)
        } else {
          // Official OpenAI API
          const openaiClient = openai.bind({ apiKey: config.apiKey })
          model = openaiClient(config.model)
        }
        break
      }

      case 'anthropic': {
        if (config.baseURL && !config.baseURL.includes('api.anthropic.com')) {
          // Custom Anthropic-compatible API
          const customClient = createAnthropic({
            apiKey: config.apiKey,
            baseURL: config.baseURL
          })
          model = customClient(config.model)
        } else {
          // Official Anthropic API
          const anthropicClient = anthropic.bind({ apiKey: config.apiKey })
          model = anthropicClient(config.model)
        }
        break
      }

      case 'google': {
        const googleClient = google.bind({ apiKey: config.apiKey })
        model = googleClient(config.model)
        break
      }

      case 'custom': {
        if (!config.customBaseURL) {
          throw new Error('Custom provider requires customBaseURL')
        }

        // Create OpenAI-compatible provider for custom APIs like SiliconFlow
        const compatibleProvider = createOpenAICompatible({
          name: 'custom-openai-compatible',
          apiKey: config.apiKey,
          baseURL: config.customBaseURL
        })

        model = compatibleProvider(config.model)
        break
      }

      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    this.models.set(cacheKey, model)
    return model
  }

  /**
   * Clears the model cache
   */
  clearCache(): void {
    this.models.clear()
  }
}

// Singleton provider instance
const vercelAIProvider = new VercelAIProvider()

/**
 * Vercel AI Model Implementation
 * Uses Vercel's AI SDK for unified provider access
 */
export class VercelAIModel implements AIModel {
  private config: VercelAIConfig
  private capabilities: ModelCapabilities
  private model: LanguageModel

  constructor(config: VercelAIConfig, capabilities: ModelCapabilities) {
    this.config = config
    this.capabilities = capabilities
    this.model = vercelAIProvider.getModel(config)
  }

  /**
   * Converts internal AIMessage format to Vercel AI SDK CoreMessage format
   */
  private convertToVercelMessages(messages: AIMessage[]): CoreMessage[] {
    return messages.map((message): CoreMessage => {
      const role =
        message.role === 'assistant' ? 'assistant' : message.role === 'system' ? 'system' : 'user'

      // Handle string content
      if (typeof message.content === 'string') {
        return {
          role,
          content: message.content
        }
      }

      // Handle multimodal content
      const content = message.content
        .map((part) => {
          switch (part.type) {
            case 'text':
              return {
                type: 'text' as const,
                text: part.text || ''
              }

            case 'image':
              if (part.image) {
                return {
                  type: 'image' as const,
                  image: part.image.url
                }
              }
              break
          }

          // Fallback to text for unknown types
          return {
            type: 'text' as const,
            text: part.text || ''
          }
        })
        .filter(Boolean)

      return {
        role,
        content
      }
    })
  }

  /**
   * Generates a complete AI response
   */
  async chat(messages: AIMessage[]): Promise<AIResponse> {
    try {
      const vercelMessages = this.convertToVercelMessages(messages)

      const result: GenerateTextResult = await generateText({
        model: this.model,
        messages: vercelMessages,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
        frequencyPenalty: this.config.frequencyPenalty,
        presencePenalty: this.config.presencePenalty
      })

      return {
        content: result.text,
        usage: result.usage
          ? {
              promptTokens: result.usage.promptTokens,
              completionTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens
            }
          : undefined
        // Note: Vercel AI SDK doesn't currently expose reasoning or tool calls in the same format
        // These could be extracted from the response if the provider supports them
      }
    } catch (error) {
      throw this.handleError(error, 'chat completion')
    }
  }

  /**
   * Generates a streaming AI response
   */
  async *stream(
    messages: AIMessage[],
    cancellationToken?: CancellationToken
  ): AsyncIterable<AIStreamChunk> {
    try {
      const vercelMessages = this.convertToVercelMessages(messages)

      const result = await streamText({
        model: this.model,
        messages: vercelMessages,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
        frequencyPenalty: this.config.frequencyPenalty,
        presencePenalty: this.config.presencePenalty
      })

      for await (const chunk of result.textStream) {
        // Check for cancellation
        if (cancellationToken?.isCancelled) {
          yield { content: '', finished: true }
          return
        }

        yield {
          content: chunk,
          finished: false
        }
      }

      // Get final usage information
      const usage = await result.usage

      yield {
        content: '',
        finished: true,
        usage: usage
          ? {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens
            }
          : undefined
      }
    } catch (error) {
      throw this.handleError(error, 'streaming chat completion')
    }
  }

  /**
   * Gets model capabilities
   */
  getCapabilities(): ModelCapabilities {
    return { ...this.capabilities }
  }

  /**
   * Gets current configuration
   */
  getConfig(): VercelAIConfig {
    return { ...this.config }
  }

  /**
   * Updates model configuration
   */
  updateConfig(newConfig: Partial<VercelAIConfig>): void {
    this.config = { ...this.config, ...newConfig }
    // Recreate model with new config
    this.model = vercelAIProvider.getModel(this.config)
  }

  /**
   * Handles errors and provides meaningful error messages
   */
  private handleError(error: unknown, context: string): Error {
    console.error(`Vercel AI SDK Error in ${context}:`, error)

    if (error instanceof Error) {
      // Handle common error patterns
      const message = error.message.toLowerCase()

      if (message.includes('401') || message.includes('unauthorized')) {
        return new Error('Invalid API key or unauthorized access')
      }
      if (message.includes('429') || message.includes('rate limit')) {
        return new Error('Rate limit exceeded. Please try again later')
      }
      if (message.includes('400') || message.includes('bad request')) {
        return new Error('Invalid request. Please check your input')
      }
      if (message.includes('503') || message.includes('service unavailable')) {
        return new Error('AI service is temporarily unavailable')
      }

      return new Error(`AI API Error: ${error.message}`)
    }

    return new Error(`Unknown AI API error in ${context}`)
  }
}

/**
 * Provider factory functions for different AI services
 */
export const VercelAIProviders = {
  /**
   * Creates OpenAI provider configuration
   */
  openai: (config: Partial<VercelAIConfig> = {}): VercelAIConfig => ({
    provider: 'openai',
    apiKey: config.apiKey || process.env.OPENAI_API_KEY || '',
    baseURL: config.baseURL || process.env.OPENAI_BASE_URL,
    model: config.model || 'gpt-4o',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
    topP: config.topP ?? 1,
    frequencyPenalty: config.frequencyPenalty ?? 0,
    presencePenalty: config.presencePenalty ?? 0
  }),

  /**
   * Creates Anthropic Claude provider configuration
   */
  anthropic: (config: Partial<VercelAIConfig> = {}): VercelAIConfig => ({
    provider: 'anthropic',
    apiKey: config.apiKey || process.env.CLAUDE_API_KEY || '',
    baseURL: config.baseURL || process.env.CLAUDE_BASE_URL,
    model: config.model || 'claude-3-5-sonnet-20241022',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
    topP: config.topP ?? 1
  }),

  /**
   * Creates Google Gemini provider configuration
   */
  google: (config: Partial<VercelAIConfig> = {}): VercelAIConfig => ({
    provider: 'google',
    apiKey: config.apiKey || process.env.GOOGLE_API_KEY || '',
    model: config.model || 'gemini-1.5-pro',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
    topP: config.topP ?? 1
  }),

  /**
   * Creates custom OpenAI-compatible provider configuration
   */
  custom: (config: Partial<VercelAIConfig> & { customBaseURL: string }): VercelAIConfig => ({
    provider: 'custom',
    apiKey: config.apiKey || '',
    customBaseURL: config.customBaseURL,
    model: config.model || 'gpt-3.5-turbo',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens ?? 4000,
    topP: config.topP ?? 1,
    frequencyPenalty: config.frequencyPenalty ?? 0,
    presencePenalty: config.presencePenalty ?? 0
  })
}

/**
 * Model capabilities for different providers
 */
export const VercelAICapabilities = {
  openai: {
    'gpt-4o': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 128000
    },
    'gpt-4o-mini': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 128000
    },
    'gpt-4-turbo': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 128000
    },
    'gpt-4': {
      supportVision: false,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 8192
    },
    'gpt-3.5-turbo': {
      supportVision: false,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 16385
    },
    'o1-preview': {
      supportVision: false,
      supportReasoning: true,
      supportToolCalls: false,
      maxContextLength: 128000
    },
    'o1-mini': {
      supportVision: false,
      supportReasoning: true,
      supportToolCalls: false,
      maxContextLength: 128000
    }
  },

  anthropic: {
    'claude-3-5-sonnet-20241022': {
      supportVision: true,
      supportReasoning: true,
      supportToolCalls: true,
      maxContextLength: 200000
    },
    'claude-3-5-haiku-20241022': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 200000
    },
    'claude-3-opus-20240229': {
      supportVision: true,
      supportReasoning: true,
      supportToolCalls: true,
      maxContextLength: 200000
    },
    'claude-3-sonnet-20240229': {
      supportVision: true,
      supportReasoning: true,
      supportToolCalls: true,
      maxContextLength: 200000
    },
    'claude-3-haiku-20240307': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 200000
    }
  },

  google: {
    'gemini-1.5-pro': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 1048576
    },
    'gemini-1.5-flash': {
      supportVision: true,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 1048576
    },
    'gemini-pro': {
      supportVision: false,
      supportReasoning: false,
      supportToolCalls: true,
      maxContextLength: 32768
    }
  }
}

/**
 * Gets model capabilities for a given provider and model
 */
export function getModelCapabilities(provider: string, model: string): ModelCapabilities {
  const defaultCapabilities: ModelCapabilities = {
    supportVision: false,
    supportReasoning: false,
    supportToolCalls: false,
    maxContextLength: 4096
  }

  switch (provider) {
    case 'openai':
      return (
        VercelAICapabilities.openai[model as keyof typeof VercelAICapabilities.openai] ||
        defaultCapabilities
      )

    case 'anthropic':
      return (
        VercelAICapabilities.anthropic[model as keyof typeof VercelAICapabilities.anthropic] ||
        defaultCapabilities
      )

    case 'google':
      return (
        VercelAICapabilities.google[model as keyof typeof VercelAICapabilities.google] ||
        defaultCapabilities
      )

    default:
      return defaultCapabilities
  }
}

/**
 * Creates a VercelAIModel instance with the specified configuration
 */
export function createVercelAIModel(config: VercelAIConfig): VercelAIModel {
  const capabilities = getModelCapabilities(config.provider, config.model)
  return new VercelAIModel(config, capabilities)
}

/**
 * Utility function to clear all cached models
 */
export function clearVercelAICache(): void {
  vercelAIProvider.clearCache()
}

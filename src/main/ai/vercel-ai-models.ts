import { generateText, streamText, type CoreMessage, type LanguageModel } from 'ai'
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
                // Check if the model supports vision
                if (!this.capabilities.supportVision) {
                  console.warn(
                    `Model ${this.config.model} does not support vision. Converting image to text description.`
                  )
                  return {
                    type: 'text' as const,
                    text: `[Image uploaded: ${part.image.alt || 'image'}. This model does not support image processing, so the image cannot be analyzed.]`
                  }
                }

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

      // Prepare the configuration object
      const generateOptions: Record<string, any> = {
        model: this.model,
        messages: vercelMessages,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
        frequencyPenalty: this.config.frequencyPenalty,
        presencePenalty: this.config.presencePenalty
      }

      // Add reasoning effort for supported models
      if (this.config.reasoningEffort && this.capabilities.supportReasoning) {
        generateOptions.reasoningEffort = this.config.reasoningEffort
      }

      const result = await generateText(generateOptions as any)

      // Extract reasoning safely
      let reasoning: string | undefined
      try {
        const rawReasoning = (result as any).reasoning
        if (rawReasoning) {
          if (typeof rawReasoning === 'string') {
            reasoning = rawReasoning
          } else if (typeof rawReasoning.then === 'function') {
            // If reasoning is a Promise, await it
            reasoning = await rawReasoning
          } else {
            console.log('Reasoning is not a string or Promise:', typeof rawReasoning)
          }
        }
      } catch (e) {
        console.log('Could not extract reasoning from non-streaming result:', e)
        reasoning = undefined
      }

      return {
        content: result.text,
        reasoning: reasoning,
        usage: result.usage
          ? {
              promptTokens: (result.usage as any).promptTokens || 0,
              completionTokens: (result.usage as any).completionTokens || 0,
              totalTokens: (result.usage as any).totalTokens || 0
            }
          : undefined
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

      // Prepare the configuration object
      const streamOptions: Record<string, any> = {
        model: this.model,
        messages: vercelMessages,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        topP: this.config.topP,
        frequencyPenalty: this.config.frequencyPenalty,
        presencePenalty: this.config.presencePenalty
      }

      // Add reasoning effort for supported models
      if (this.config.reasoningEffort && this.capabilities.supportReasoning) {
        streamOptions.reasoningEffort = this.config.reasoningEffort
      }

      const result = await streamText(streamOptions as any)

      let accumulatedReasoning = ''
      let hasReceivedContent = false

      try {
        for await (const chunk of result.textStream) {
          // Check for cancellation
          if (cancellationToken?.isCancelled) {
            yield { content: '', finished: true }
            return
          }

          hasReceivedContent = true
          yield {
            content: chunk,
            finished: false
          }
        }
      } catch (streamError) {
        console.error('Error in text stream:', streamError)
        if (!hasReceivedContent) {
          // If we haven't received any content, this might be a vision-related error
          throw new Error(
            'Stream failed to produce output. This might be due to incompatible input format (e.g., images with non-vision models) or model-specific issues.'
          )
        }
        // If we got some content, continue to finalization
      }

      // Try to extract reasoning from the final result
      try {
        await result.finishReason
        // Try different ways to access reasoning based on AI SDK implementation
        const rawReasoning = (result as any).reasoning
        if (rawReasoning) {
          if (typeof rawReasoning === 'string') {
            accumulatedReasoning = rawReasoning
          } else if (typeof rawReasoning.then === 'function') {
            // If reasoning is a Promise, await it
            try {
              const resolvedReasoning = await rawReasoning
              if (typeof resolvedReasoning === 'string') {
                accumulatedReasoning = resolvedReasoning
              }
            } catch (promiseError) {
              console.log('Failed to await reasoning promise:', promiseError)
            }
          } else {
            console.log('Reasoning is not a string or Promise in streaming:', typeof rawReasoning)
          }
        }
      } catch (e) {
        // Reasoning might not be available in streaming mode
        console.log('Could not extract reasoning from streaming result:', e)
      }

      // Get final usage information
      const usage = await result.usage

      yield {
        content: '',
        reasoning: accumulatedReasoning || undefined,
        finished: true,
        usage: usage
          ? {
              promptTokens: (usage as any).promptTokens || 0,
              completionTokens: (usage as any).completionTokens || 0,
              totalTokens: (usage as any).totalTokens || 0
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

      // Handle vision-related errors
      if (message.includes('no output generated') || message.includes('nooutputgeneratederror')) {
        // Check if this might be a vision-related issue
        return new Error(
          `The model failed to generate a response. This might be due to: 1) Image format not supported by this model, 2) Model doesn't properly support vision, or 3) Input content caused processing issues. Try using text-only messages or a different model.`
        )
      }

      if (
        message.includes('image') ||
        message.includes('vision') ||
        message.includes('multimodal')
      ) {
        return new Error(
          `Vision processing error: ${error.message}. The model may not support the image format or vision capabilities.`
        )
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
    presencePenalty: config.presencePenalty ?? 0,
    reasoningEffort: config.reasoningEffort
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
    topP: config.topP ?? 1,
    reasoningEffort: config.reasoningEffort
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
    presencePenalty: config.presencePenalty ?? 0,
    reasoningEffort: config.reasoningEffort
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
    },
    'o3-mini': {
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

    case 'custom':
      // For custom providers, try to infer capabilities from model name
      return inferCustomModelCapabilities(model)

    default:
      return defaultCapabilities
  }
}

/**
 * Infers capabilities for custom models based on model names
 */
function inferCustomModelCapabilities(model: string): ModelCapabilities {
  const lowerModel = model.toLowerCase()

  // Default capabilities for custom models
  const capabilities: ModelCapabilities = {
    supportVision: false,
    supportReasoning: false,
    supportToolCalls: false,
    maxContextLength: 8192
  }

  // Vision model patterns
  const visionPatterns = [
    'vision',
    'multimodal',
    'mm',
    'visual',
    'glm-4v',
    'qwen-vl',
    'cogvlm',
    'llava',
    'glm-4.1v' // Specific pattern for GLM-4.1V models
  ]

  // Reasoning model patterns
  const reasoningPatterns = ['thinking', 'reasoning', 'o1', 'cot', 'reflection']

  // Check for vision support
  if (visionPatterns.some((pattern) => lowerModel.includes(pattern))) {
    capabilities.supportVision = true
    capabilities.maxContextLength = 32768 // Vision models typically have larger context

    // Log capabilities for debugging
    console.log(`[AI] Model ${model} detected with vision support: ${capabilities.supportVision}`)
  }

  // Check for reasoning support
  if (reasoningPatterns.some((pattern) => lowerModel.includes(pattern))) {
    capabilities.supportReasoning = true
  }

  // Most custom models support tool calls
  capabilities.supportToolCalls = true

  return capabilities
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

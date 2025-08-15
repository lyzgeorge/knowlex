import { createVercelAIModel, VercelAIProviders, type VercelAIConfig } from '../ai/vercel-ai-models'
import type { Message, MessageContent } from '../../shared/types'
import type { CancellationToken } from '../utils/cancellation'
import type { AIMessage, AIResponse } from '../../shared/types/ai'

/**
 * Vercel AI SDK Chat Service
 * Modern replacement for the current AI chat service using Vercel's AI SDK
 * Provides unified interface to multiple AI providers with streaming support
 */

/**
 * Configuration interface for the AI chat service
 */
export interface AIChatConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  apiKey: string
  baseURL?: string
  customBaseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}

/**
 * Gets AI configuration from environment variables with fallbacks
 */
export function getAIConfigFromEnv(): AIChatConfig {
  const defaultProvider = (process.env.DEFAULT_PROVIDER || 'openai') as AIChatConfig['provider']

  switch (defaultProvider) {
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: process.env.CLAUDE_API_KEY || '',
        baseURL: process.env.CLAUDE_BASE_URL,
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
        reasoningEffort: process.env.CLAUDE_REASONING_EFFORT as
          | 'low'
          | 'medium'
          | 'high'
          | undefined
      }

    case 'google':
      return {
        provider: 'google',
        apiKey: process.env.GOOGLE_API_KEY || '',
        model: process.env.GOOGLE_MODEL || 'gemini-1.5-pro',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000')
      }

    case 'custom':
      return {
        provider: 'custom',
        apiKey: process.env.CUSTOM_API_KEY || '',
        customBaseURL: process.env.CUSTOM_BASE_URL || '',
        model: process.env.CUSTOM_MODEL || 'gpt-3.5-turbo',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000')
      }

    default: {
      // openai
      const baseURL = process.env.OPENAI_BASE_URL
      const isCustomAPI = baseURL && !baseURL.includes('api.openai.com')

      return {
        provider: isCustomAPI ? 'custom' : 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: baseURL,
        customBaseURL: isCustomAPI ? baseURL : undefined,
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
        topP: parseFloat(process.env.AI_TOP_P || '1'),
        frequencyPenalty: parseFloat(process.env.AI_FREQUENCY_PENALTY || '0'),
        presencePenalty: parseFloat(process.env.AI_PRESENCE_PENALTY || '0'),
        reasoningEffort: process.env.OPENAI_REASONING_EFFORT as
          | 'low'
          | 'medium'
          | 'high'
          | undefined
      }
    }
  }
}

/**
 * Validates AI configuration
 */
export function validateAIConfiguration(config?: AIChatConfig): {
  isValid: boolean
  error?: string
} {
  const chatConfig = config || getAIConfigFromEnv()

  if (!chatConfig.apiKey || chatConfig.apiKey.trim().length === 0) {
    return {
      isValid: false,
      error: `AI model integration is not configured. Missing API key for ${chatConfig.provider.toUpperCase()}`
    }
  }

  if (!chatConfig.model || chatConfig.model.trim().length === 0) {
    return {
      isValid: false,
      error: `No model specified for ${chatConfig.provider}. Please configure a model.`
    }
  }

  if (chatConfig.provider === 'custom' && !chatConfig.customBaseURL) {
    return {
      isValid: false,
      error: 'Custom provider requires a base URL to be configured.'
    }
  }

  return { isValid: true }
}

/**
 * Converts application messages to AI model format
 */
export function convertMessagesToAIFormat(messages: Message[]): AIMessage[] {
  return messages.map((message): AIMessage => {
    // Handle multimodal content
    if (
      message.content.length === 1 &&
      message.content[0]?.type === 'text' &&
      message.content[0]?.text
    ) {
      // Simple text message
      return {
        role: message.role,
        content: message.content[0].text
      }
    }

    // Complex multimodal content
    const aiContent = message.content
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
                image: part.image.url // AI SDK expects just the URL/data URL string
              }
            }
            break

          case 'temporary-file':
            if (part.temporaryFile) {
              return {
                type: 'text' as const,
                text: `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}\n[End of file]`
              }
            }
            break

          case 'citation':
            if (part.citation) {
              return {
                type: 'text' as const,
                text: `[Citation: ${part.citation.filename}]\n${part.citation.content}`
              }
            }
            break
        }

        // Fallback for unknown types
        return {
          type: 'text' as const,
          text: part.text || ''
        }
      })
      .filter(Boolean)

    return {
      role: message.role,
      content: aiContent
    }
  })
}

/**
 * Converts AI response to application message format
 */
export function convertAIResponseToMessageContent(response: AIResponse): MessageContent {
  const content: MessageContent = []

  // Add main content
  if (response.content) {
    content.push({
      type: 'text',
      text: response.content
    })
  }

  // Note: Reasoning is now handled separately and not included in content

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
 * Creates a Vercel AI model from the chat configuration
 */
function createModelFromConfig(config: AIChatConfig): VercelAIConfig {
  switch (config.provider) {
    case 'openai':
      return VercelAIProviders.openai({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        reasoningEffort: config.reasoningEffort
      })

    case 'anthropic':
      return VercelAIProviders.anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        reasoningEffort: config.reasoningEffort
      })

    case 'google':
      return VercelAIProviders.google({
        apiKey: config.apiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP
      })

    case 'custom':
      return VercelAIProviders.custom({
        apiKey: config.apiKey,
        customBaseURL: config.customBaseURL!,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        reasoningEffort: config.reasoningEffort
      })

    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

/**
 * Generates an AI response for a conversation
 */
export async function generateAIResponse(
  conversationMessages: Message[]
): Promise<{ content: MessageContent; reasoning?: string }> {
  // Validate configuration
  const validation = validateAIConfiguration()
  if (!validation.isValid) {
    throw new Error(validation.error || 'AI configuration is invalid')
  }

  // Get configuration and create model
  const config = getAIConfigFromEnv()
  const vercelConfig = createModelFromConfig(config)
  const model = createVercelAIModel(vercelConfig)

  try {
    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    // Generate response
    const response = await model.chat(aiMessages)

    // Convert response to application format
    return {
      content: convertAIResponseToMessageContent(response),
      reasoning: typeof response.reasoning === 'string' ? response.reasoning : undefined
    }
  } catch (error) {
    console.error('AI response generation failed:', error)
    throw enhanceError(error, config.provider)
  }
}

/**
 * Generates an AI response with streaming support
 */
export async function generateAIResponseWithStreaming(
  conversationMessages: Message[],
  onChunk: (chunk: string) => void,
  cancellationToken?: CancellationToken
): Promise<{ content: MessageContent; reasoning?: string }> {
  // Validate configuration
  const validation = validateAIConfiguration()
  if (!validation.isValid) {
    throw new Error(validation.error || 'AI configuration is invalid')
  }

  // Get configuration and create model
  const config = getAIConfigFromEnv()
  const vercelConfig = createModelFromConfig(config)
  const model = createVercelAIModel(vercelConfig)

  try {
    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    // Log model capabilities for debugging
    const capabilities = model.getCapabilities()
    console.log(`[AI] Using model: ${config.model} (provider: ${config.provider})`)
    console.log(`[AI] Model capabilities:`, capabilities)

    // Check if messages contain images and warn if model doesn't support vision
    const hasImages = conversationMessages.some(
      (msg) => Array.isArray(msg.content) && msg.content.some((part) => part.type === 'image')
    )

    if (hasImages && !capabilities.supportVision) {
      console.warn(`[AI] Warning: Images detected but model ${config.model} may not support vision`)
    }

    // Accumulate the full response content and reasoning
    let fullContent = ''
    let reasoning: string | undefined

    // Stream response
    for await (const chunk of model.stream(aiMessages, cancellationToken)) {
      // Check for cancellation
      if (cancellationToken?.isCancelled) {
        console.log('AI streaming cancelled by user')
        break
      }

      if (chunk.content) {
        fullContent += chunk.content
        onChunk(chunk.content)
      }

      if (chunk.reasoning) {
        // Ensure reasoning is always a string, never a Promise
        if (typeof chunk.reasoning === 'string') {
          reasoning = chunk.reasoning
        } else {
          console.log('Warning: chunk.reasoning is not a string:', typeof chunk.reasoning)
        }
      }

      if (chunk.finished) {
        break
      }
    }

    // Convert final response to application format
    return {
      content: [
        {
          type: 'text',
          text: fullContent
        }
      ],
      reasoning: typeof reasoning === 'string' ? reasoning : undefined
    }
  } catch (error) {
    console.error('AI streaming response generation failed:', error)
    throw enhanceError(error, config.provider)
  }
}

/**
 * Tests AI configuration by making a simple API call
 */
export async function testAIConfiguration(config?: AIChatConfig): Promise<{
  success: boolean
  error?: string
  model?: string
  provider?: string
}> {
  try {
    const chatConfig = config || getAIConfigFromEnv()
    const validation = validateAIConfiguration(chatConfig)

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const vercelConfig = createModelFromConfig(chatConfig)
    const model = createVercelAIModel(vercelConfig)

    // Test with a simple message
    await model.chat([
      {
        role: 'user',
        content: 'Hello! Please respond with just "OK" to confirm the connection.'
      }
    ])

    return {
      success: true,
      model: chatConfig.model,
      provider: chatConfig.provider
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during AI configuration test'
    }
  }
}

/**
 * Gets available models for a specific provider
 */
export function getAvailableModels(provider: string): string[] {
  switch (provider) {
    case 'openai':
      return [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'o1-preview',
        'o1-mini',
        'o3-mini'
      ]

    case 'anthropic':
      return [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ]

    case 'google':
      return ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']

    default:
      return []
  }
}

/**
 * Gets all available providers and their models
 */
export function getAvailableProviders(): Array<{
  provider: string
  displayName: string
  models: string[]
}> {
  return [
    {
      provider: 'openai',
      displayName: 'OpenAI',
      models: getAvailableModels('openai')
    },
    {
      provider: 'anthropic',
      displayName: 'Anthropic Claude',
      models: getAvailableModels('anthropic')
    },
    {
      provider: 'google',
      displayName: 'Google Gemini',
      models: getAvailableModels('google')
    },
    {
      provider: 'custom',
      displayName: 'Custom (OpenAI-compatible)',
      models: ['custom-model'] // Placeholder - user can specify any model
    }
  ]
}

/**
 * Enhances error messages with provider-specific context
 */
function enhanceError(error: unknown, provider: string): Error {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Provider-specific error enhancements
    if (message.includes('api key')) {
      return new Error(
        `Invalid ${provider.toUpperCase()} API key. Please check your configuration.`
      )
    }
    if (message.includes('rate limit')) {
      return new Error(`${provider.toUpperCase()} rate limit exceeded. Please try again later.`)
    }
    if (message.includes('network') || message.includes('fetch')) {
      return new Error('Network error. Please check your internet connection and try again.')
    }
    if (message.includes('model')) {
      return new Error(
        `Model error with ${provider}: ${error.message}. Please check your model configuration.`
      )
    }

    return new Error(`${provider.toUpperCase()} service error: ${error.message}`)
  }

  return new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}

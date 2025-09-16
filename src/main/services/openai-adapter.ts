import { streamText, generateText } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { Message, MessageContent } from '@shared/types/message'
import type { CancellationToken } from '@main/utils/cancellation'
import type { ReasoningEffort } from '@shared/types/models'
import { modelConfigService } from './model-config-service'
import { formatOperationError, getErrorMessage } from '@shared/utils/error-handling'
import { resolveModelContext, type ModelResolutionContext } from '@shared/utils/model-resolution'
import { StreamingCallbacks, consumeFullStream } from './ai-streaming'
import { buildModelParams, convertMessagesToAIFormat } from './ai-params'
import { retryWithReasoningFallback } from './ai-retry'
import { DEFAULT_AI_CONFIG } from '@shared/constants/ai'

/**
 * OpenAI Adapter Service using official AI SDK
 * Supports only OpenAI-compatible models with optional reasoning effort
 */

/**
 * Default smooth streaming options
 */
const DEFAULT_SMOOTH_OPTIONS = {
  enabled: true,
  delayInMs: 20,
  chunking: /[\u4E00-\u9FFF]|\S+\s+/
} as const

/**
 * Configuration interface for OpenAI-compatible models
 */
export interface OpenAIConfig {
  apiKey: string
  baseURL: string | undefined
  model: string
  temperature?: number | undefined
  maxTokens?: number | undefined
  topP?: number | undefined
  frequencyPenalty?: number | undefined
  presencePenalty?: number | undefined
  reasoningEffort?: ReasoningEffort | undefined
  smooth?:
    | {
        enabled: boolean
        delayInMs?: number | undefined
        chunking?: RegExp | 'word' | 'line' | undefined
      }
    | undefined
}

/**
 * Gets OpenAI configuration from environment variables
 */
export function getOpenAIConfigFromEnv(): OpenAIConfig {
  const config: OpenAIConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.AI_TEMPERATURE || DEFAULT_AI_CONFIG.temperature.toString()),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || DEFAULT_AI_CONFIG.maxTokens.toString()),
    topP: parseFloat(process.env.AI_TOP_P || DEFAULT_AI_CONFIG.topP.toString()),
    frequencyPenalty: parseFloat(
      process.env.AI_FREQUENCY_PENALTY || DEFAULT_AI_CONFIG.frequencyPenalty.toString()
    ),
    presencePenalty: parseFloat(
      process.env.AI_PRESENCE_PENALTY || DEFAULT_AI_CONFIG.presencePenalty.toString()
    )
  }

  // Only add reasoningEffort if it's set in environment
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT as ReasoningEffort | undefined
  if (reasoningEffort) {
    config.reasoningEffort = reasoningEffort
  }

  // Set default smooth streaming configuration
  config.smooth = DEFAULT_SMOOTH_OPTIONS

  return config
}

/**
 * Validates OpenAI configuration
 */
export function validateOpenAIConfig(config?: OpenAIConfig): {
  isValid: boolean
  error?: string
} {
  const chatConfig = config || getOpenAIConfigFromEnv()

  if (!chatConfig.apiKey || chatConfig.apiKey.trim().length === 0) {
    return {
      isValid: false,
      error: 'AI model integration is not configured. Missing OpenAI API key'
    }
  }

  if (!chatConfig.model || chatConfig.model.trim().length === 0) {
    return {
      isValid: false,
      error: 'No model specified. Please configure a model.'
    }
  }

  return { isValid: true }
}

/**
 * Creates OpenAI model instance from configuration
 */
function createOpenAIModel(config: OpenAIConfig) {
  // Use createOpenAICompatible for both official and custom OpenAI-compatible APIs
  const provider = createOpenAICompatible({
    name: 'openai-provider',
    apiKey: config.apiKey,
    baseURL: config.baseURL || 'https://api.openai.com/v1',
    includeUsage: true // Include usage information in streaming responses
  })
  return provider(config.model)
}

/**
 * Generates an AI response for a conversation
 */
// Removed generateAIResponseOnce to unify on streamAIResponse/model resolution.

// Streaming callbacks and consumeFullStream are imported from './ai-streaming'

/**
 * Generates an AI response with streaming support
 */
export async function streamAIResponse(
  conversationMessages: Message[],
  options: {
    modelConfigId?: string | undefined
    conversationModelId?: string | undefined
    userDefaultModelId?: string | undefined
    reasoningEffort?: ReasoningEffort | undefined
  } & (StreamingCallbacks | { onTextChunk: (chunk: string) => void }),
  cancellationToken?: CancellationToken
): Promise<{ content: MessageContent; reasoning?: string }> {
  const { modelConfigId, conversationModelId, userDefaultModelId, reasoningEffort, ...callbacks } =
    options

  // Use centralized model resolution
  const availableModels = await modelConfigService.list()
  const resolutionContext: ModelResolutionContext = {
    explicitModelId: modelConfigId || null,
    conversationModelId: conversationModelId || null,
    userDefaultModelId: userDefaultModelId || null,
    availableModels
  }

  const resolution = resolveModelContext(resolutionContext)

  // Log resolution trace for debugging
  console.log('[AI] Model resolution:', {
    source: resolution.source,
    modelId: resolution.modelConfig?.id,
    trace: resolution.trace
  })

  if (resolution.warnings.length > 0) {
    console.warn('[AI] Model resolution warnings:', resolution.warnings)
  }

  const modelConfig = resolution.modelConfig

  // Prefer the resolved model configuration; fail fast if none available.
  if (!modelConfig) {
    throw new Error('No model resolved. Please configure a model in Settings → Models.')
  }

  const config: OpenAIConfig = {
    apiKey: modelConfig.apiKey || '',
    baseURL: modelConfig.apiEndpoint,
    model: modelConfig.modelId,
    temperature: modelConfig.temperature,
    topP: modelConfig.topP,
    frequencyPenalty: modelConfig.frequencyPenalty,
    presencePenalty: modelConfig.presencePenalty,
    reasoningEffort,
    smooth: DEFAULT_SMOOTH_OPTIONS
  }

  const model = createOpenAIModel(config)

  // Convert messages to AI format once and reuse for attempts
  const aiMessages = convertMessagesToAIFormat(conversationMessages)

  const attempt = async (withReasoning: boolean) => {
    console.log(`[AI] Using model: ${config.model}`)
    const modelParams = buildModelParams(model, aiMessages, config, {
      includeReasoningOptions: withReasoning,
      includeSmoothStreaming: true
    })
    const result = streamText(modelParams)
    const streamCallbacks = callbacks as StreamingCallbacks
    const consumed = await consumeFullStream(result.fullStream, streamCallbacks, cancellationToken)
    if (consumed.cancelled) {
      console.log('[AI] Returning partial content due to cancellation')
      return {
        content: [
          {
            type: 'text' as const,
            text: consumed.text
          }
        ],
        ...(consumed.reasoning && { reasoning: consumed.reasoning })
      }
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: consumed.text
        }
      ],
      ...(consumed.reasoning !== undefined && { reasoning: consumed.reasoning })
    }
  }

  const isParamError = (e: any) => {
    const msg = e?.message ?? String(e)
    return /400|Bad Request|Unknown parameter|reasoning/i.test(msg)
  }

  try {
    return await retryWithReasoningFallback(
      attempt,
      config.reasoningEffort !== undefined,
      isParamError,
      { warn: console.warn, error: (e) => console.error('AI streaming retry failed:', e) }
    )
  } catch (error) {
    console.error('AI streaming response generation failed:', error)
    throw enhanceError(error)
  }
}

/**
 * Tests AI configuration by making a simple API call
 */
export async function testOpenAIConfig(config?: OpenAIConfig): Promise<{
  success: boolean
  error?: string
  model?: string
}> {
  try {
    const chatConfig = config || getOpenAIConfigFromEnv()
    const validation = validateOpenAIConfig(chatConfig)

    if (!validation.isValid) {
      return {
        success: false,
        ...(validation.error && { error: validation.error })
      }
    }

    const model = createOpenAIModel(chatConfig)

    // Build model parameters
    const modelParams = buildModelParams(
      model,
      [
        {
          role: 'user' as const,
          content: 'Hello! Please respond with just "OK" to confirm the connection.'
        }
      ],
      chatConfig,
      {
        includeReasoningOptions: true
      }
    )

    // Test with a simple message
    await generateText(modelParams)

    return {
      success: true,
      model: chatConfig.model
    }
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, 'Unknown error during AI configuration test')
    }
  }
}

/**
 * Enhances error messages with context
 */
function enhanceError(error: unknown): Error {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes('api key')) {
      return new Error('Invalid OpenAI API key. Please check your configuration.')
    }
    if (message.includes('rate limit')) {
      return new Error('OpenAI rate limit exceeded. Please try again later.')
    }
    if (message.includes('network') || message.includes('fetch')) {
      return new Error('Network error. Please check your internet connection and try again.')
    }
    if (message.includes('model')) {
      return new Error(`Model error: ${error.message}. Please check your model configuration.`)
    }

    return new Error(`OpenAI service error: ${error.message}`)
  }

  return new Error(formatOperationError('AI service', error))
}

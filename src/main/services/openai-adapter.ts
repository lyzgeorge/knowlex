import { streamText, generateText, smoothStream } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { Message, MessageContent } from '@shared/types/message'
import type { CancellationToken } from '@main/utils/cancellation'
import type { ReasoningEffort } from '@shared/types/models'
import { modelConfigService } from './model-config-service'
import { resolveModelContext, type ModelResolutionContext } from '@shared/utils/model-resolution'
import { StreamingCallbacks, consumeFullStream } from './ai-streaming'

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
 * Build provider-specific options (keeps reasoning option construction in one place)
 */
function buildProviderOptions(config: OpenAIConfig, includeReasoningOptions: boolean) {
  const providerOptions: Record<string, any> = {}
  if (includeReasoningOptions && config.reasoningEffort !== undefined) {
    providerOptions.openai = { reasoningEffort: config.reasoningEffort }
  }
  return providerOptions
}

/**
 * Builds model parameters with consistent configuration
 */
function buildModelParams(
  model: any,
  messages: any[],
  config: OpenAIConfig,
  options: {
    includeReasoningOptions?: boolean
    includeSmoothStreaming?: boolean
  } = {}
) {
  const { includeReasoningOptions = false, includeSmoothStreaming = false } = options

  // Prepare provider options via factory
  const providerOptions = buildProviderOptions(config, includeReasoningOptions)

  const modelParams: any = {
    model,
    messages,
    ...(config.temperature !== undefined && { temperature: config.temperature }),
    ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    ...(config.topP !== undefined && { topP: config.topP }),
    ...(config.frequencyPenalty !== undefined && { frequencyPenalty: config.frequencyPenalty }),
    ...(config.presencePenalty !== undefined && { presencePenalty: config.presencePenalty }),
    ...(Object.keys(providerOptions).length > 0 && { providerOptions })
  }

  // Add smooth streaming transform if enabled and requested
  if (includeSmoothStreaming && config.smooth?.enabled) {
    modelParams.experimental_transform = smoothStream({
      delayInMs: config.smooth.delayInMs || 20,
      chunking: config.smooth.chunking || 'word'
    })
  }

  return modelParams
}

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
  reasoningEffort?: 'low' | 'medium' | 'high' | undefined
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
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4000'),
    topP: parseFloat(process.env.AI_TOP_P || '1'),
    frequencyPenalty: parseFloat(process.env.AI_FREQUENCY_PENALTY || '0'),
    presencePenalty: parseFloat(process.env.AI_PRESENCE_PENALTY || '0')
  }

  // Only add reasoningEffort if it's set in environment
  const reasoningEffort = process.env.OPENAI_REASONING_EFFORT as
    | 'low'
    | 'medium'
    | 'high'
    | undefined
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
 * Converts application messages to AI SDK format
 */
function convertMessagesToAIFormat(messages: Message[]) {
  // Define lightweight AI SDK part types
  type AITextPart = { type: 'text'; text: string }
  type AIImagePart = { type: 'image'; image: any; mediaType?: string }
  type AIPart = AITextPart | AIImagePart
  type AIMessage = { role: string; content: string | AIPart[] }

  // Helper: detect single plain text fast-path
  const isSinglePlainText = (m: Message) =>
    m.content.length === 1 && m.content[0]?.type === 'text' && Boolean(m.content[0]?.text)

  // Helper: convert a single application part to an AI SDK part or null
  const convertPartToAI = (part: any): AIPart | null => {
    switch (part.type) {
      case 'text':
        return part.text ? ({ type: 'text', text: part.text } as AITextPart) : null
      case 'temporary-file':
        if (part.temporaryFile) {
          const text = `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}\n[End of file]`
          return { type: 'text', text }
        }
        return null
      case 'citation':
        if (part.citation) {
          const text = `[Citation: ${part.citation.filename}]\n${part.citation.content}`
          return { type: 'text', text }
        }
        return null
      case 'image':
        if (part.image && typeof part.image.image === 'string') {
          return {
            type: 'image',
            image: part.image.image,
            ...(part.image.mediaType ? { mediaType: part.image.mediaType } : {})
          }
        }
        return null
      default:
        return null
    }
  }

  // Helper: collapse parts to single text string when possible
  const collapsePartsToText = (parts: AIPart[]) => {
    if (parts.length === 0) return ''
    if (parts.length === 1 && parts[0] && parts[0].type === 'text')
      return (parts[0] as AITextPart).text
    return null
  }

  return messages.map((message) => {
    if (isSinglePlainText(message)) {
      return { role: message.role, content: message.content[0]!.text! } as AIMessage
    }

    const hasNonText = message.content.some((p) => p.type !== 'text')

    if (hasNonText) {
      const parts = message.content.map(convertPartToAI).filter(Boolean) as AIPart[]

      const collapsed = collapsePartsToText(parts)
      if (collapsed !== null) {
        return { role: message.role, content: collapsed } as AIMessage
      }

      return { role: message.role, content: parts } as AIMessage
    }

    // Fallback: join multiple text parts
    const text = message.content
      .map((p) => (p.type === 'text' ? p.text || '' : ''))
      .filter(Boolean)
      .join('\n\n')
    return { role: message.role, content: text } as AIMessage
  })
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
export async function generateAIResponseOnce(
  conversationMessages: Message[]
): Promise<{ content: MessageContent; reasoning?: string }> {
  // Validate configuration
  const validation = validateOpenAIConfig()
  if (!validation.isValid) {
    throw new Error(validation.error || 'AI configuration is invalid')
  }

  const config = getOpenAIConfigFromEnv()
  const model = createOpenAIModel(config)

  try {
    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    // Build model parameters
    const modelParams = buildModelParams(model, aiMessages, config, {
      includeReasoningOptions: true
    })

    // Generate response
    const result = await generateText(modelParams)

    // Convert response to application format
    return {
      content: [
        {
          type: 'text',
          text: result.text
        }
      ]
    }
  } catch (error) {
    console.error('AI response generation failed:', error)
    throw enhanceError(error)
  }
}

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
  // Helper to attempt streaming with or without reasoning options
  async function attemptStream(withReasoning: boolean) {
    console.log(`[AI] Using model: ${config.model}`)

    // Build model parameters (reuse aiMessages computed in outer scope)
    const modelParams = buildModelParams(model, aiMessages, config, {
      includeReasoningOptions: withReasoning,
      includeSmoothStreaming: true
    })

    // Stream response
    const result = streamText(modelParams)

    const streamCallbacks = callbacks as StreamingCallbacks

    // Consume fullStream using centralized handler
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

    // If not cancelled, use the consumed accumulation as the authoritative final text
    // (Mode B: consumeFullStream is the single source of truth for streamed content)
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

  try {
    // First try with reasoning if provided
    return await attemptStream(true)
  } catch (error: any) {
    const msg = error?.message ?? String(error)
    const mayBeParamError = /400|Bad Request|Unknown parameter|reasoning/i.test(msg)
    if (config.reasoningEffort !== undefined && mayBeParamError) {
      console.warn('[AI] Retrying without reasoning parameters due to provider error...')
      try {
        return await attemptStream(false)
      } catch (e2) {
        console.error('AI streaming retry without reasoning failed:', e2)
        throw enhanceError(e2)
      }
    }
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
      ...(error instanceof Error
        ? { error: error.message }
        : { error: 'Unknown error during AI configuration test' })
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

  return new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
}

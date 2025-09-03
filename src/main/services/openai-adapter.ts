import { streamText, generateText, smoothStream } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { Message, MessageContent } from '@shared/types/message'
import type { CancellationToken } from '@main/utils/cancellation'
import type { ReasoningEffort } from '@shared/types/models'
import { modelConfigService } from './model-config-service'
import { resolveModelContext, type ModelResolutionContext } from '@shared/utils/model-resolution'

/**
 * OpenAI Adapter Service using official AI SDK
 * Supports only OpenAI-compatible models with optional reasoning effort
 */

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
  config.smooth = {
    enabled: true,
    delayInMs: 20,
    chunking: /[\u4E00-\u9FFF]|\S+\s+/
  }

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
  return messages.map((message) => {
    // Fast-path: single plain text message
    if (
      message.content.length === 1 &&
      message.content[0]?.type === 'text' &&
      message.content[0]?.text
    ) {
      return { role: message.role, content: message.content[0].text }
    }

    // If any part is non-text, build parts array for AI SDK
    const hasNonText = message.content.some((p) => p.type !== 'text')

    if (hasNonText) {
      const parts = message.content
        .map((part) => {
          switch (part.type) {
            case 'text':
              return part.text ? { type: 'text' as const, text: part.text } : null
            case 'temporary-file':
              if (part.temporaryFile) {
                const text = `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}\n[End of file]`
                return { type: 'text' as const, text }
              }
              return null
            case 'citation':
              if (part.citation) {
                const text = `[Citation: ${part.citation.filename}]\n${part.citation.content}`
                return { type: 'text' as const, text }
              }
              return null
            case 'image':
              if (part.image && typeof part.image.image === 'string') {
                // Pass base64 (optionally data URL) directly to AI SDK
                return {
                  type: 'image' as const,
                  image: part.image.image,
                  ...(part.image.mediaType ? { mediaType: part.image.mediaType } : {})
                }
              }
              return null
            default:
              return null
          }
        })
        .filter(Boolean) as Array<
        { type: 'text'; text: string } | { type: 'image'; image: any; mediaType?: string }
      >

      // If parts collapse to a single text, return as string for efficiency
      if (parts.length === 1) {
        const first: any = parts[0]
        if (first && first.type === 'text') {
          return { role: message.role, content: first.text }
        }
      }
      return { role: message.role, content: parts }
    }

    // Fallback: join multiple text parts
    const text = message.content
      .map((p) => (p.type === 'text' ? p.text || '' : ''))
      .filter(Boolean)
      .join('\n\n')
    return { role: message.role, content: text }
  })
}

/**
 * Creates OpenAI model instance from configuration
 */
function createOpenAIModel(config: OpenAIConfig) {
  if (config.baseURL && !config.baseURL.includes('api.openai.com')) {
    // Custom OpenAI-compatible API (like SiliconFlow)
    const provider = createOpenAICompatible({
      name: 'custom-provider',
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      includeUsage: true // Include usage information in streaming responses
    })
    return provider(config.model)
  } else {
    // Official OpenAI API - create provider with custom API key
    const provider = createOpenAI({
      apiKey: config.apiKey
    })
    return provider(config.model)
  }
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

    // Prepare model parameters
    const providerOptions: Record<string, any> = {}
    if (config.reasoningEffort !== undefined) {
      // Pass reasoning effort via providerOptions for OpenAI providers
      providerOptions.openai = { reasoningEffort: config.reasoningEffort }
      // Also set for custom-compatible provider name to maximize compatibility
      providerOptions['custom-provider'] = { reasoningEffort: config.reasoningEffort }
    }

    const modelParams: any = {
      model,
      messages: aiMessages,
      ...(config.temperature !== undefined && { temperature: config.temperature }),
      ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
      ...(config.topP !== undefined && { topP: config.topP }),
      ...(config.frequencyPenalty !== undefined && { frequencyPenalty: config.frequencyPenalty }),
      ...(config.presencePenalty !== undefined && { presencePenalty: config.presencePenalty }),
      ...(Object.keys(providerOptions).length > 0 && { providerOptions })
    }

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

/**
 * Callback interface for streaming events
 */
export interface StreamingCallbacks {
  // Fired when fullStream emits 'start'. Useful to lazily create resources (e.g., conversations/messages).
  onStreamStart?: () => void
  // Fired when fullStream emits 'start' for UI feedback (e.g., sparkle animation)
  onStart?: () => void
  // Text lifecycle
  onTextStart?: () => void
  // Fired for each assistant text delta
  onTextChunk: (chunk: string) => void
  onTextEnd?: () => void
  // Reasoning lifecycle
  onReasoningChunk?: (chunk: string) => void
  onReasoningStart?: () => void
  onReasoningEnd?: () => void
  // Fired when fullStream emits 'finish' (before awaiting final text)
  onStreamFinish?: () => void
}

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

  let config: OpenAIConfig
  if (modelConfig) {
    // Use model configuration
    config = {
      apiKey: modelConfig.apiKey || '',
      baseURL: modelConfig.apiEndpoint,
      model: modelConfig.modelId,
      temperature: modelConfig.temperature,
      topP: modelConfig.topP,
      frequencyPenalty: modelConfig.frequencyPenalty,
      presencePenalty: modelConfig.presencePenalty,
      reasoningEffort,
      smooth: {
        enabled: true,
        delayInMs: 20,
        chunking: /[\u4E00-\u9FFF]|\S+\s+/
      }
    }
  } else {
    // Fallback to environment configuration
    const validation = validateOpenAIConfig()
    if (!validation.isValid) {
      throw new Error(validation.error || 'No model configured. Add a model in Settings → Models.')
    }
    config = getOpenAIConfigFromEnv()
    if (reasoningEffort) {
      config.reasoningEffort = reasoningEffort
    }
  }

  const model = createOpenAIModel(config)

  let streamedText = ''
  let streamedReasoning = ''

  // Helper to attempt streaming with or without reasoning options
  async function attemptStream(withReasoning: boolean) {
    streamedText = ''
    streamedReasoning = ''

    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    console.log(`[AI] Using model: ${config.model}`)

    // Prepare model parameters
    const providerOptions: Record<string, any> = {}
    if (withReasoning && config.reasoningEffort !== undefined) {
      providerOptions.openai = { reasoningEffort: config.reasoningEffort }
      providerOptions['custom-provider'] = { reasoningEffort: config.reasoningEffort }
    }

    const modelParams: any = {
      model,
      messages: aiMessages,
      ...(config.temperature !== undefined && { temperature: config.temperature }),
      ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
      ...(config.topP !== undefined && { topP: config.topP }),
      ...(config.frequencyPenalty !== undefined && { frequencyPenalty: config.frequencyPenalty }),
      ...(config.presencePenalty !== undefined && { presencePenalty: config.presencePenalty }),
      ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
      // Add smooth streaming transform if enabled
      ...(config.smooth?.enabled && {
        experimental_transform: smoothStream({
          delayInMs: config.smooth.delayInMs || 20,
          chunking: config.smooth.chunking || 'word'
        })
      })
    }

    // Stream response
    const result = streamText(modelParams)

    // Handle both old callback format and new callbacks interface
    const streamCallbacks: StreamingCallbacks =
      typeof callbacks === 'function'
        ? { onTextChunk: callbacks }
        : (callbacks as StreamingCallbacks)

    // Stream response using fullStream for reasoning support
    let wasCancelled = false

    // Use fullStream only (no fallback to textStream)
    try {
      for await (const part of result.fullStream) {
        // Check for cancellation
        if (cancellationToken?.isCancelled) {
          console.log('AI streaming cancelled by user')
          wasCancelled = true
          break
        }

        // Only log verbose details for unknown types and critical events
        if (part.type === 'text-delta' || part.type === 'reasoning-delta') {
          // Don't log every text chunk to reduce noise
        } else if (
          ['start', 'start-step', 'finish', 'finish-step', 'done', 'stream-start'].includes(
            part.type
          )
        ) {
          // These are normal flow events, log briefly
          console.log(`[AI] Stream event: ${part.type}`)
        } else {
          // Log more details for other events
          console.log('[AI] FullStream part received:', {
            type: part.type,
            keys: Object.keys(part)
          })
        }

        switch (part.type) {
          case 'start':
            // Stream initialization
            streamCallbacks.onStreamStart?.()
            // Also trigger UI start event for sparkle animation
            streamCallbacks.onStart?.()
            break

          case 'start-step':
            // Step initialization
            break

          case 'text-start':
            console.log('[AI] Text start')
            streamCallbacks.onTextStart?.()
            break

          case 'text-delta':
            // console.log('[AI] Text delta received:', JSON.stringify(part.text))

            if (part.text && part.text.length > 0) {
              streamedText += part.text
              streamCallbacks.onTextChunk(part.text)
            }
            break

          case 'text-end':
            console.log('[AI] Text end')
            streamCallbacks.onTextEnd?.()
            break

          case 'reasoning-start':
            console.log('[AI] Reasoning start')
            streamCallbacks.onReasoningStart?.()
            break

          case 'reasoning-delta':
            // console.log('[AI] Reasoning delta received:', JSON.stringify(part.text))
            if (part.text && part.text.length > 0) {
              streamedReasoning += part.text
              streamCallbacks.onReasoningChunk?.(part.text)
            }
            break

          case 'reasoning-end':
            console.log('[AI] Reasoning end event received')
            streamCallbacks.onReasoningEnd?.()
            break

          case 'finish-step':
            // Step completion events
            break

          case 'finish':
            // Stream completion events
            streamCallbacks.onStreamFinish?.()
            break

          case 'tool-call':
          case 'tool-result':
            console.log(`[AI] Tool event: ${part.type}`)
            break

          case 'error':
            console.error('AI streaming error:', part.error)
            throw part.error

          default:
            console.log('[AI] Unknown fullStream part type:', part.type, part)
        }
      }
    } catch (error) {
      console.error('[AI] FullStream error:', error)
      throw error
    }

    // If cancelled, return immediately with streamed content
    if (wasCancelled) {
      console.log('[AI] Returning partial content due to cancellation')
      return {
        content: [
          {
            type: 'text' as const,
            text: streamedText
          }
        ],
        ...(streamedReasoning && { reasoning: streamedReasoning })
      }
    }

    // Wait for completion and get final results only if not cancelled
    const [text, reasoningText] = await Promise.all([result.text, result.reasoningText])

    // Convert final response to application format
    return {
      content: [
        {
          type: 'text' as const,
          text
        }
      ],
      ...(reasoningText !== undefined && { reasoning: reasoningText })
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

    // Prepare model parameters
    const modelParams = {
      model,
      messages: [
        {
          role: 'user' as const,
          content: 'Hello! Please respond with just "OK" to confirm the connection.'
        }
      ],
      ...(chatConfig.reasoningEffort !== undefined && {
        reasoningEffort: chatConfig.reasoningEffort
      })
    }

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
 * Gets available OpenAI models (configured via environment)
 */
export function getAvailableModels(): string[] {
  // Models are configured via OPENAI_MODEL environment variable
  // No need to define or verify specific model names
  return []
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

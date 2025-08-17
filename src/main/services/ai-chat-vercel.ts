import { streamText, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { Message, MessageContent } from '../../shared/types'
import type { CancellationToken } from '../utils/cancellation'

/**
 * Model parameters for AI SDK
 */
interface ModelParams {
  model: any
  messages: any[]
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}

/**
 * Simplified AI Chat Service using official AI SDK
 * Supports only OpenAI-compatible models with optional reasoning effort
 */

/**
 * Configuration interface for OpenAI-compatible models
 */
export interface AIChatConfig {
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  reasoningEffort?: 'low' | 'medium' | 'high'
}

/**
 * Gets AI configuration from environment variables
 */
export function getAIConfigFromEnv(): AIChatConfig {
  const config: AIChatConfig = {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL,
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

  return config
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

    // Complex multimodal content - convert all to text
    const textParts = message.content
      .map((part) => {
        switch (part.type) {
          case 'text':
            return part.text || ''

          case 'temporary-file':
            if (part.temporaryFile) {
              return `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}\n[End of file]`
            }
            break

          case 'citation':
            if (part.citation) {
              return `[Citation: ${part.citation.filename}]\n${part.citation.content}`
            }
            break

          case 'image':
            console.warn('[AI] Image content type is not supported')
            break
        }

        return part.text || ''
      })
      .filter(Boolean)

    return {
      role: message.role,
      content: textParts.join('\n\n')
    }
  })
}

/**
 * Creates OpenAI model instance from configuration
 */
function createOpenAIModel(config: AIChatConfig) {
  if (config.baseURL && !config.baseURL.includes('api.openai.com')) {
    // Custom OpenAI-compatible API (like SiliconFlow)
    return createOpenAICompatible({
      name: 'custom-provider',
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      includeUsage: true // Include usage information in streaming responses
    })
  } else {
    // Official OpenAI API
    return openai({
      apiKey: config.apiKey
    })
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

  const config = getAIConfigFromEnv()
  const model = createOpenAIModel(config)

  try {
    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    // Prepare model parameters
    const modelParams: ModelParams = {
      model: model(config.model),
      messages: aiMessages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty
    }

    // Only add reasoningEffort if it's configured
    if (config.reasoningEffort) {
      modelParams.reasoningEffort = config.reasoningEffort
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
      ],
      reasoning: result.reasoningText
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
  onTextChunk: (chunk: string) => void
  onReasoningChunk?: (chunk: string) => void
  onReasoningStart?: () => void
  onReasoningEnd?: () => void
}

/**
 * Generates an AI response with streaming support
 */
export async function generateAIResponseWithStreaming(
  conversationMessages: Message[],
  callbacks: StreamingCallbacks | ((chunk: string) => void),
  cancellationToken?: CancellationToken
): Promise<{ content: MessageContent; reasoning?: string }> {
  // Validate configuration
  const validation = validateAIConfiguration()
  if (!validation.isValid) {
    throw new Error(validation.error || 'AI configuration is invalid')
  }

  const config = getAIConfigFromEnv()
  const model = createOpenAIModel(config)

  try {
    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    console.log(`[AI] Using model: ${config.model}`)

    // Prepare model parameters
    const modelParams: ModelParams = {
      model: model(config.model),
      messages: aiMessages,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
      presencePenalty: config.presencePenalty
    }

    // Only add reasoningEffort if it's configured
    if (config.reasoningEffort) {
      modelParams.reasoningEffort = config.reasoningEffort
    }

    // Stream response
    const result = streamText(modelParams)

    // Handle both old callback format and new callbacks interface
    const streamCallbacks: StreamingCallbacks =
      typeof callbacks === 'function' ? { onTextChunk: callbacks } : callbacks

    // Try both textStream and fullStream approaches
    let reasoningPhaseComplete = false
    let hasSeenReasoningStart = false

    try {
      // First try to use fullStream for reasoning support
      for await (const part of result.fullStream) {
        // Check for cancellation
        if (cancellationToken?.isCancelled) {
          console.log('AI streaming cancelled by user')
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
            break

          case 'start-step':
            // Step initialization
            break

          case 'text-delta':
            // console.log('[AI] Text delta received:', JSON.stringify(part.text))

            // If we had reasoning but haven't seen reasoning-end yet, call it now
            if (hasSeenReasoningStart && !reasoningPhaseComplete) {
              console.log('[AI] First text chunk after reasoning - calling onReasoningEnd')
              reasoningPhaseComplete = true
              streamCallbacks.onReasoningEnd?.()
            }

            if (part.text && part.text.length > 0) {
              streamCallbacks.onTextChunk(part.text)
            }
            break

          case 'reasoning-start':
            console.log('[AI] Reasoning start')
            hasSeenReasoningStart = true
            streamCallbacks.onReasoningStart?.()
            break

          case 'reasoning-delta':
            // console.log('[AI] Reasoning delta received:', JSON.stringify(part.text))
            if (part.text && part.text.length > 0) {
              streamCallbacks.onReasoningChunk?.(part.text)
            }
            break

          case 'reasoning-end':
            console.log('[AI] Reasoning end event received')
            reasoningPhaseComplete = true
            streamCallbacks.onReasoningEnd?.()
            break

          case 'finish-step':
          case 'step-finish':
            // Step completion events
            break

          case 'finish':
          case 'done':
            // Stream completion events
            break

          case 'stream-start':
            // Stream start event
            break

          case 'tool-call':
          case 'tool-call-delta':
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
      console.log('[AI] FullStream failed, falling back to textStream:', error)

      // Fallback to regular textStream if fullStream fails
      for await (const textChunk of result.textStream) {
        // Check for cancellation
        if (cancellationToken?.isCancelled) {
          console.log('AI streaming cancelled by user')
          break
        }

        console.log('[AI] TextStream chunk received:', JSON.stringify(textChunk))
        if (textChunk && textChunk.length > 0) {
          streamCallbacks.onTextChunk(textChunk)
        }
      }
    }

    // Wait for completion and get final results
    const [text, reasoningText] = await Promise.all([result.text, result.reasoningText])

    // Convert final response to application format
    return {
      content: [
        {
          type: 'text',
          text
        }
      ],
      reasoning: reasoningText
    }
  } catch (error) {
    console.error('AI streaming response generation failed:', error)
    throw enhanceError(error)
  }
}

/**
 * Tests AI configuration by making a simple API call
 */
export async function testAIConfiguration(config?: AIChatConfig): Promise<{
  success: boolean
  error?: string
  model?: string
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

    const model = createOpenAIModel(chatConfig)

    // Prepare model parameters
    const modelParams: ModelParams = {
      model: model(chatConfig.model),
      messages: [
        {
          role: 'user',
          content: 'Hello! Please respond with just "OK" to confirm the connection.'
        }
      ]
    }

    // Only add reasoningEffort if it's configured
    if (chatConfig.reasoningEffort) {
      modelParams.reasoningEffort = chatConfig.reasoningEffort
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
      error: error instanceof Error ? error.message : 'Unknown error during AI configuration test'
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

import { getModel } from '../ai'
import type { AIConfig, AIMessage, AIResponse } from '../../shared/types/ai'
import type { Message, MessageContent } from '../../shared/types'

/**
 * AI Chat Service
 * Handles AI model configuration and chat completions
 * Integrates with environment variables and the AI model manager
 */

/**
 * Gets AI configuration from environment variables
 * Uses the default provider specified in .env or falls back to OpenAI
 */
export function getAIConfigFromEnv(): AIConfig {
  const defaultProvider = process.env.DEFAULT_PROVIDER || 'openai'

  if (defaultProvider === 'claude') {
    return {
      provider: 'claude',
      apiKey: process.env.CLAUDE_API_KEY || '',
      baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: 4000,
      temperature: 0.7
    }
  }

  // Default to OpenAI configuration
  return {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: 4000,
    temperature: 0.7
  }
}

/**
 * Validates that required API keys are configured
 */
export function validateAIConfiguration(): { isValid: boolean; error?: string } {
  const config = getAIConfigFromEnv()

  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return {
      isValid: false,
      error: `AI model integration is not yet configured. Please set up your API keys in the .env file. Missing: ${config.provider.toUpperCase()}_API_KEY`
    }
  }

  if (!config.model || config.model.trim().length === 0) {
    return {
      isValid: false,
      error: `No model specified for ${config.provider}. Please set ${config.provider.toUpperCase()}_MODEL in your .env file.`
    }
  }

  return { isValid: true }
}

/**
 * Converts application messages to AI model format
 */
export function convertMessagesToAIFormat(messages: Message[]): AIMessage[] {
  return messages.map((message): AIMessage => {
    // Extract text content from message parts
    const contentParts: string[] = []

    message.content.forEach((part) => {
      if (part.type === 'text' && part.text) {
        contentParts.push(part.text)
      } else if (part.type === 'temporary-file' && part.temporaryFile) {
        // Include temporary file content in AI context
        contentParts.push(
          `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}\n[End of file]`
        )
      }
    })

    return {
      role: message.role,
      content: contentParts.join('\n\n')
    }
  })
}

/**
 * Converts AI response content to application message format
 */
export function convertAIResponseToMessageContent(response: AIResponse): MessageContent {
  return [
    {
      type: 'text',
      text: response.content
    }
  ]
}

/**
 * Generates an AI response for a conversation
 * Takes conversation messages and returns AI-generated response content
 */
export async function generateAIResponse(conversationMessages: Message[]): Promise<MessageContent> {
  // Validate configuration
  const validation = validateAIConfiguration()
  if (!validation.isValid) {
    throw new Error(validation.error || 'AI configuration is invalid')
  }

  // Get AI model configuration
  const config = getAIConfigFromEnv()

  try {
    // Get AI model instance
    const model = await getModel(config)

    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    // Generate response
    const response = await model.chat(aiMessages)

    // Convert response to application format
    return convertAIResponseToMessageContent(response)
  } catch (error) {
    console.error('AI response generation failed:', error)

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your .env file configuration.')
      }
      if (error.message.includes('rate limit')) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      if (error.message.includes('model')) {
        throw new Error(`Model error: ${error.message}. Please check your model configuration.`)
      }
    }

    throw new Error(`AI service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates an AI response with streaming support
 * Takes conversation messages and onChunk callback for real-time streaming
 * Returns the final message content after streaming is complete
 */
export async function generateAIResponseWithStreaming(
  conversationMessages: Message[],
  onChunk: (chunk: string) => void
): Promise<MessageContent> {
  // Validate configuration
  const validation = validateAIConfiguration()
  if (!validation.isValid) {
    throw new Error(validation.error || 'AI configuration is invalid')
  }

  // Get AI model configuration
  const config = getAIConfigFromEnv()

  try {
    // Get AI model instance
    const model = await getModel(config)

    // Convert messages to AI format
    const aiMessages = convertMessagesToAIFormat(conversationMessages)

    // Accumulate the full response content
    let fullContent = ''

    // Stream response
    for await (const chunk of model.stream(aiMessages)) {
      if (chunk.content) {
        fullContent += chunk.content
        onChunk(chunk.content)
      }

      if (chunk.finished) {
        break
      }
    }

    // Convert final response to application format
    return [
      {
        type: 'text',
        text: fullContent
      }
    ]
  } catch (error) {
    console.error('AI streaming response generation failed:', error)

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Invalid API key. Please check your .env file configuration.')
      }
      if (error.message.includes('rate limit')) {
        throw new Error('API rate limit exceeded. Please try again later.')
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.')
      }
      if (error.message.includes('model')) {
        throw new Error(`Model error: ${error.message}. Please check your model configuration.`)
      }
    }

    throw new Error(
      `AI streaming service error: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Tests AI configuration by making a simple API call
 */
export async function testAIConfiguration(): Promise<{
  success: boolean
  error?: string
  model?: string
}> {
  try {
    const validation = validateAIConfiguration()
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const config = getAIConfigFromEnv()
    const model = await getModel(config)

    // Test with a simple message
    await model.chat([
      {
        role: 'user',
        content: 'Hello! Please respond with just "OK" to confirm the connection.'
      }
    ])

    return {
      success: true,
      model: config.model
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during AI configuration test'
    }
  }
}

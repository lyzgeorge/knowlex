/**
 * OpenAI Agents Service
 *
 * Integrates OpenAI Agents JS SDK for chat functionality, title generation,
 * and summary generation with error handling and retry mechanisms.
 */

import { Agent, run, Runner } from '@openai/agents'
import { z } from 'zod'
import { ChatAPIConfig } from '@knowlex/types'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatResponse {
  content: string
  conversationId: string
  messageId: string
  sources?: Array<{
    fileId: number
    filename: string
    snippet: string
    score: number
  }>
}

export interface StreamChatResponse {
  content: string
  isComplete: boolean
  conversationId: string
  messageId: string
  sources?: Array<{
    fileId: number
    filename: string
    snippet: string
    score: number
  }>
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

export class OpenAIAgentsService {
  private config: ChatAPIConfig | null = null
  private runner: Runner | null = null
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2,
  }

  constructor(config?: ChatAPIConfig) {
    if (config) {
      this.updateConfig(config)
    }
  }

  /**
   * Update OpenAI configuration
   */
  updateConfig(config: ChatAPIConfig): void {
    this.config = config

    // Create a new Runner instance with the updated config
    this.runner = new Runner({
      modelProvider: {
        name: 'openai',
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      },
      model: config.model,
      tracingDisabled: true, // Disable tracing for privacy
    })
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    if (!this.config || !this.runner) {
      return { success: false, error: 'OpenAI configuration not set' }
    }

    const startTime = Date.now()

    try {
      const testAgent = new Agent({
        name: 'Test Agent',
        instructions: 'You are a test agent. Respond with exactly "OK" to confirm the connection.',
      })

      const result = await this.executeWithRetry(async () => {
        return await run(testAgent, 'Test connection')
      })

      const latency = Date.now() - startTime

      if (result.finalOutput?.toLowerCase().includes('ok')) {
        return { success: true, latency }
      } else {
        return { success: false, error: 'Unexpected response from API' }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send a chat message (non-streaming)
   */
  async sendMessage(
    messages: ChatMessage[],
    context?: string,
    systemPrompt?: string
  ): Promise<ChatResponse> {
    if (!this.config || !this.runner) {
      throw new Error('OpenAI configuration not set')
    }

    try {
      const agent = this.createChatAgent(systemPrompt)
      const userMessage = this.formatMessagesForAgent(messages, context)

      const result = await this.executeWithRetry(async () => {
        return await this.runner!.run(agent, userMessage)
      })

      return {
        content: result.finalOutput || '',
        conversationId: this.generateId(),
        messageId: this.generateId(),
      }
    } catch (error) {
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send a chat message with streaming response
   */
  async *sendMessageStream(
    messages: ChatMessage[],
    context?: string,
    systemPrompt?: string
  ): AsyncGenerator<StreamChatResponse> {
    if (!this.config || !this.runner) {
      throw new Error('OpenAI configuration not set')
    }

    try {
      const agent = this.createChatAgent(systemPrompt)
      const userMessage = this.formatMessagesForAgent(messages, context)

      const conversationId = this.generateId()
      const messageId = this.generateId()

      const stream = await this.executeWithRetry(async () => {
        return await this.runner!.run(agent, userMessage, { stream: true })
      })

      // let _accumulatedContent = ''

      for await (const event of stream) {
        if (event.type === 'text') {
          // _accumulatedContent += event.data
          yield {
            content: event.data,
            isComplete: false,
            conversationId,
            messageId,
          }
        } else if (event.type === 'final_output') {
          yield {
            content: '',
            isComplete: true,
            conversationId,
            messageId,
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to stream message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate title for conversation
   */
  async generateTitle(messages: ChatMessage[]): Promise<string> {
    if (!this.config || !this.runner) {
      throw new Error('OpenAI configuration not set')
    }

    try {
      const titleAgent = new Agent({
        name: 'Title Generator',
        instructions: `You are a title generator. Generate a concise, descriptive title (maximum 10 words) for the conversation based on the messages provided. 
        The title should capture the main topic or question being discussed. 
        Respond with ONLY the title, no additional text or formatting.`,
        outputType: z.object({
          title: z.string().describe('A concise title for the conversation'),
        }),
      })

      const conversationText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')

      const result = await this.executeWithRetry(async () => {
        return await this.runner!.run(
          titleAgent,
          `Generate a title for this conversation:\n\n${conversationText}`
        )
      })

      return result.finalOutput?.title || 'Untitled Chat'
    } catch (error) {
      console.warn('Failed to generate title:', error)
      return 'Untitled Chat'
    }
  }

  /**
   * Generate summary for conversation
   */
  async generateSummary(messages: ChatMessage[], maxTokens: number = 1000): Promise<string> {
    if (!this.config || !this.runner) {
      throw new Error('OpenAI configuration not set')
    }

    try {
      const summaryAgent = new Agent({
        name: 'Summary Generator',
        instructions: `You are a conversation summarizer. Create a concise summary of the conversation that captures the key points, questions asked, and conclusions reached.
        Keep the summary under ${maxTokens} tokens and focus on the most important information.
        Use clear, professional language and organize the summary logically.`,
        outputType: z.object({
          summary: z.string().describe('A concise summary of the conversation'),
        }),
      })

      const conversationText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')

      const result = await this.executeWithRetry(async () => {
        return await this.runner!.run(
          summaryAgent,
          `Summarize this conversation:\n\n${conversationText}`
        )
      })

      return result.finalOutput?.summary || 'Unable to generate summary'
    } catch (error) {
      console.warn('Failed to generate summary:', error)
      return 'Unable to generate summary'
    }
  }

  /**
   * Create a chat agent with optional system prompt
   */
  private createChatAgent(systemPrompt?: string): Agent {
    const defaultInstructions = `You are Knowlex, a helpful desktop AI assistant. You provide accurate, helpful, and contextual responses to user questions.
    
    Key guidelines:
    - Be concise but thorough in your responses
    - Use the provided context when available to give more accurate answers
    - If you don't know something, say so clearly
    - Format your responses clearly with proper structure when needed
    - Be professional but friendly in tone`

    return new Agent({
      name: 'Knowlex Assistant',
      instructions: systemPrompt || defaultInstructions,
    })
  }

  /**
   * Format messages and context for the agent
   */
  private formatMessagesForAgent(messages: ChatMessage[], context?: string): string {
    let formattedMessage = ''

    if (context) {
      formattedMessage += `Context:\n${context}\n\n`
    }

    // Get the last user message as the primary input
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()
    if (lastUserMessage) {
      formattedMessage += lastUserMessage.content
    }

    return formattedMessage
  }

  /**
   * Execute function with exponential backoff retry
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break
        }

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        )

        console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message)
        await this.sleep(delay)
      }
    }

    throw lastError || new Error('Unknown error during retry execution')
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'timeout',
      'network',
      'rate limit',
      '429',
      '500',
      '502',
      '503',
      '504',
    ]

    const errorMessage = error.message.toLowerCase()
    return retryableErrors.some(retryableError => errorMessage.includes(retryableError))
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current configuration
   */
  getConfig(): ChatAPIConfig | null {
    return this.config
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.config !== null && this.runner !== null
  }
}

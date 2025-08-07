/**
 * Frontend OpenAI Agents Service
 *
 * Provides frontend interface for OpenAI Agents functionality through IPC.
 * Handles chat messages, streaming responses, title generation, and summaries.
 */

import { ipcService, StreamController } from '../ipc.service'
import { IPC_CHANNELS } from '../../types/ipc.types'
import {
  SendMessageRequest,
  StreamResponseChunk,
  GenerateTitleRequest,
  GenerateSummaryRequest,
  TestAPIResponse,
} from '@knowlex/types'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface SendMessageOptions {
  conversationId?: string
  projectId?: number
  ragEnabled?: boolean
  systemPrompt?: string
  files?: Array<{
    id: number
    name: string
    content: string
  }>
}

export interface ChatResponse {
  conversationId: string
  messageId: string
  content: string
  sources?: Array<{
    fileId: number
    filename: string
    snippet: string
    score: number
  }>
}

export interface StreamChatOptions extends SendMessageOptions {
  onData: (chunk: StreamResponseChunk) => void
  onError?: (error: Error) => void
  onEnd?: () => void
}

export class OpenAIAgentsService {
  /**
   * Send a chat message (non-streaming)
   */
  async sendMessage(message: string, options: SendMessageOptions = {}): Promise<ChatResponse> {
    const request: SendMessageRequest = {
      message,
      conversationId: options.conversationId,
      projectId: options.projectId,
      ragEnabled: options.ragEnabled ?? true,
      systemPrompt: options.systemPrompt,
      files: options.files?.map(file => ({
        filename: file.name,
        size: file.content.length,
        mimeType: 'text/plain',
        md5: '', // Will be calculated by backend
        path: '', // Will be set by backend
      })),
    }

    try {
      const response = await ipcService.request<SendMessageRequest, ChatResponse>(
        IPC_CHANNELS.CHAT_SEND_MESSAGE,
        request
      )

      return response
    } catch (error) {
      throw new Error(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Send a chat message with streaming response
   */
  sendMessageStream(message: string, options: StreamChatOptions): StreamController {
    const request: SendMessageRequest = {
      message,
      conversationId: options.conversationId,
      projectId: options.projectId,
      ragEnabled: options.ragEnabled ?? true,
      systemPrompt: options.systemPrompt,
      files: options.files?.map(file => ({
        filename: file.name,
        size: file.content.length,
        mimeType: 'text/plain',
        md5: '', // Will be calculated by backend
        path: '', // Will be set by backend
      })),
    }

    const onData = (chunk: any) => {
      try {
        const parsedChunk: StreamResponseChunk = JSON.parse(chunk.data)
        options.onData(parsedChunk)
      } catch (error) {
        console.error('Failed to parse stream chunk:', error)
        options.onError?.(new Error('Failed to parse stream data'))
      }
    }

    return ipcService.startStream(
      IPC_CHANNELS.CHAT_STREAM_RESPONSE,
      request,
      onData,
      options.onError,
      options.onEnd
    )
  }

  /**
   * Generate title for conversation
   */
  async generateTitle(conversationId: string): Promise<string> {
    const request: GenerateTitleRequest = {
      conversationId,
      messages: [], // Messages will be fetched by the backend
    }

    try {
      const response = await ipcService.request<GenerateTitleRequest, { title: string }>(
        IPC_CHANNELS.CHAT_GENERATE_TITLE,
        request
      )

      return response.title
    } catch (error) {
      console.warn('Failed to generate title:', error)
      return 'Untitled Chat'
    }
  }

  /**
   * Generate summary for conversation
   */
  async generateSummary(conversationId: string, maxTokens?: number): Promise<string> {
    const request: GenerateSummaryRequest = {
      conversationId,
      messages: [], // Messages will be fetched by the backend
      maxTokens,
    }

    try {
      const response = await ipcService.request<GenerateSummaryRequest, { summary: string }>(
        IPC_CHANNELS.CHAT_GENERATE_SUMMARY,
        request
      )

      return response.summary
    } catch (error) {
      console.warn('Failed to generate summary:', error)
      return 'Unable to generate summary'
    }
  }

  /**
   * Test OpenAI API connection
   */
  async testConnection(config: {
    apiKey: string
    baseUrl: string
    model: string
  }): Promise<{ success: boolean; latency?: number; error?: string }> {
    try {
      const response = await ipcService.request<any, TestAPIResponse>(
        IPC_CHANNELS.SETTINGS_TEST_API,
        {
          type: 'chat',
          config,
        }
      )

      return {
        success: response.success,
        latency: response.latency,
        error: response.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Format messages for display
   */
  formatMessages(messages: ChatMessage[]): string {
    return messages
      .map(msg => {
        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''
        const prefix =
          msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'Assistant' : 'System'
        return `[${timestamp}] ${prefix}: ${msg.content}`
      })
      .join('\n\n')
  }

  /**
   * Extract user messages from conversation
   */
  extractUserMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter(msg => msg.role === 'user')
  }

  /**
   * Extract assistant messages from conversation
   */
  extractAssistantMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter(msg => msg.role === 'assistant')
  }

  /**
   * Get last message from conversation
   */
  getLastMessage(messages: ChatMessage[]): ChatMessage | null {
    return messages.length > 0 ? messages[messages.length - 1] : null
  }

  /**
   * Get last user message from conversation
   */
  getLastUserMessage(messages: ChatMessage[]): ChatMessage | null {
    const userMessages = this.extractUserMessages(messages)
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null
  }

  /**
   * Count tokens (rough estimation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English
    // ~1 character per token for Chinese
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const otherChars = text.length - chineseChars

    return Math.ceil(chineseChars + otherChars / 4)
  }

  /**
   * Truncate text to approximate token limit
   */
  truncateToTokens(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text)

    if (estimatedTokens <= maxTokens) {
      return text
    }

    // Rough truncation based on character count
    const ratio = maxTokens / estimatedTokens
    const targetLength = Math.floor(text.length * ratio)

    return text.substring(0, targetLength) + '...'
  }

  /**
   * Validate message content
   */
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' }
    }

    if (message.length > 10000) {
      return { valid: false, error: 'Message is too long (max 10,000 characters)' }
    }

    return { valid: true }
  }

  /**
   * Clean message content
   */
  cleanMessage(message: string): string {
    return message
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
  }
}

// Export singleton instance
export const openaiAgentsService = new OpenAIAgentsService()

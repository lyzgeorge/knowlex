/**
 * Chat Handler
 *
 * Handles chat-related IPC requests including sending messages,
 * streaming responses, title generation, and summary generation.
 */

import { IpcMainEvent } from 'electron'
import { BaseIPCHandler } from './base.handler'
import { IPCMessage, IPCResponse, IPC_CHANNELS } from '../types/ipc.types'
import { OpenAIClient, ChatMessage } from '../services/ai/openai.client'
import { DatabaseService } from '../services/database/database.service'
import { FileImportService } from '../services/file/file-import.service'
import { ipcManager } from './ipc.manager'
import {
  SendMessageRequest,
  StreamResponseChunk,
  GenerateTitleRequest,
  GenerateSummaryRequest,
} from '@knowlex/types'

export class ChatHandler extends BaseIPCHandler {
  protected handlerName = 'ChatHandler'
  private openaiService: OpenAIClient
  private databaseService: DatabaseService
  private fileImportService: FileImportService

  constructor(openaiService: OpenAIClient, databaseService: DatabaseService) {
    super()
    this.openaiService = openaiService
    this.databaseService = databaseService
    this.fileImportService = new FileImportService()
  }

  /**
   * Register all chat-related IPC handlers
   */
  registerHandlers(): void {
    ipcManager.registerHandler(IPC_CHANNELS.CHAT_SEND_MESSAGE, this.handleSendMessage.bind(this))
    ipcManager.registerHandler(
      IPC_CHANNELS.CHAT_STREAM_RESPONSE,
      this.handleStreamResponse.bind(this)
    )
    ipcManager.registerHandler(
      IPC_CHANNELS.CHAT_GENERATE_TITLE,
      this.handleGenerateTitle.bind(this)
    )
    ipcManager.registerHandler(
      IPC_CHANNELS.CHAT_GENERATE_SUMMARY,
      this.handleGenerateSummary.bind(this)
    )
  }

  /**
   * Handle send message request (non-streaming)
   */
  private async handleSendMessage(
    message: IPCMessage<{ channel: string; data: SendMessageRequest }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: requestData } = data
      this.validateRequired(requestData, ['message'])

      if (!this.openaiService.isConfigured()) {
        throw new Error('OpenAI service not configured')
      }

      // Get conversation history if conversationId is provided
      let messages: ChatMessage[] = []
      let context: string | undefined
      let systemPrompt: string | undefined

      if (requestData.conversationId) {
        const conversation = await this.getConversationHistory(requestData.conversationId)
        messages = conversation.messages
        context = conversation.context
        systemPrompt = conversation.systemPrompt
      }

      // Process file imports if provided
      let fileContext = ''
      if (requestData.files && requestData.files.length > 0) {
        const importResult = await this.fileImportService.importFiles(requestData.files)

        // Handle import errors
        if (importResult.errors.length > 0) {
          this.log('warn', 'File import errors', importResult.errors)
          // Continue processing with successful files, but log errors
        }

        // Format successful files for context
        if (importResult.success.length > 0) {
          fileContext = this.fileImportService.formatFilesForContext(importResult.success)
        }
      }

      // Combine user message with file context
      let userMessageContent = requestData.message
      if (fileContext) {
        userMessageContent = `文件内容：\n\n${fileContext}\n\n---\n\n用户消息：\n${requestData.message}`
      }

      // Add the new user message
      messages.push({
        role: 'user',
        content: userMessageContent,
      })

      // Get RAG context if enabled and projectId is provided
      if (requestData.ragEnabled && requestData.projectId) {
        const ragContext = await this.getRAGContext(requestData.message, requestData.projectId)
        context = ragContext.context
      }

      // Add project memories as system prompt if projectId is provided
      if (requestData.projectId) {
        const projectMemories = await this.getProjectMemories(requestData.projectId)
        if (projectMemories.length > 0) {
          systemPrompt = projectMemories.join('\n\n')
        }
      }

      // Send message to OpenAI
      const response = await this.openaiService.sendMessage(messages, context, systemPrompt)

      // Save conversation to database
      const conversationId = await this.saveConversation(
        requestData.conversationId,
        requestData.projectId,
        messages,
        response.content
      )

      return {
        conversationId,
        messageId: response.messageId,
        content: response.content,
        sources: response.sources,
      }
    })
  }

  /**
   * Handle streaming response request
   */
  private async handleStreamResponse(
    message: IPCMessage<{ channel: string; data: SendMessageRequest; sessionId: string }>,
    event: IpcMainEvent
  ): Promise<IPCResponse | null> {
    try {
      this.validateMessage(message)
      const { data: requestData, sessionId } = message.data

      this.validateRequired(requestData, ['message'])

      if (!this.openaiService.isConfigured()) {
        throw new Error('OpenAI service not configured')
      }

      // Start streaming session
      const streamSession = ipcManager.startStream(sessionId, event.sender)

      // Get conversation history and context (similar to handleSendMessage)
      let messages: ChatMessage[] = []
      let context: string | undefined
      let systemPrompt: string | undefined

      if (requestData.conversationId) {
        const conversation = await this.getConversationHistory(requestData.conversationId)
        messages = conversation.messages
        context = conversation.context
        systemPrompt = conversation.systemPrompt
      }

      // Process file imports if provided (same logic as handleSendMessage)
      let fileContext = ''
      if (requestData.files && requestData.files.length > 0) {
        const importResult = await this.fileImportService.importFiles(requestData.files)

        // Handle import errors
        if (importResult.errors.length > 0) {
          this.log('warn', 'File import errors in stream', importResult.errors)
          // Continue processing with successful files
        }

        // Format successful files for context
        if (importResult.success.length > 0) {
          fileContext = this.fileImportService.formatFilesForContext(importResult.success)
        }
      }

      // Combine user message with file context
      let userMessageContent = requestData.message
      if (fileContext) {
        userMessageContent = `文件内容：\n\n${fileContext}\n\n---\n\n用户消息：\n${requestData.message}`
      }

      messages.push({
        role: 'user',
        content: userMessageContent,
      })

      if (requestData.ragEnabled && requestData.projectId) {
        const ragContext = await this.getRAGContext(requestData.message, requestData.projectId)
        context = ragContext.context
      }

      if (requestData.projectId) {
        const projectMemories = await this.getProjectMemories(requestData.projectId)
        if (projectMemories.length > 0) {
          systemPrompt = projectMemories.join('\n\n')
        }
      }

      // Start streaming response
      this.streamChatResponse(streamSession, messages, context, systemPrompt, requestData)

      // Return null to indicate streaming response (no immediate response)
      return null
    } catch (error) {
      this.log('error', `Error starting stream: ${message.id}`, error)
      return this.createErrorResponse(message.id, error as Error)
    }
  }

  /**
   * Handle generate title request
   */
  private async handleGenerateTitle(
    message: IPCMessage<{ channel: string; data: GenerateTitleRequest }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: requestData } = data
      this.validateRequired(requestData, ['conversationId'])

      if (!this.openaiService.isConfigured()) {
        throw new Error('OpenAI service not configured')
      }

      // Get conversation messages
      const conversation = await this.getConversationHistory(requestData.conversationId)

      // Generate title
      const title = await this.openaiService.generateTitle(conversation.messages)

      // Update conversation title in database
      await this.updateConversationTitle(requestData.conversationId, title)

      return { title }
    })
  }

  /**
   * Handle generate summary request
   */
  private async handleGenerateSummary(
    message: IPCMessage<{ channel: string; data: GenerateSummaryRequest }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: requestData } = data
      this.validateRequired(requestData, ['conversationId'])

      if (!this.openaiService.isConfigured()) {
        throw new Error('OpenAI service not configured')
      }

      // Get conversation messages
      const conversation = await this.getConversationHistory(requestData.conversationId)

      // Generate summary
      const summary = await this.openaiService.generateSummary(
        conversation.messages,
        requestData.maxTokens
      )

      return { summary }
    })
  }

  /**
   * Stream chat response
   */
  private async streamChatResponse(
    streamSession: any, // StreamSession from ipc.manager - avoiding circular import
    messages: ChatMessage[],
    context?: string,
    systemPrompt?: string,
    requestData?: SendMessageRequest
  ): Promise<void> {
    try {
      let conversationId: string | undefined
      let accumulatedContent = ''

      const streamGenerator = this.openaiService.sendMessageStream(messages, context, systemPrompt)

      for await (const chunk of streamGenerator) {
        if (!conversationId) {
          conversationId = chunk.conversationId
        }

        accumulatedContent += chunk.content

        const streamChunk: StreamResponseChunk = {
          conversationId: chunk.conversationId,
          messageId: chunk.messageId,
          content: chunk.content,
          isComplete: chunk.isComplete,
          sources: chunk.sources,
        }

        // Write chunk to stream
        streamSession.write(JSON.stringify(streamChunk))

        if (chunk.isComplete) {
          // Save complete conversation to database
          if (conversationId && accumulatedContent) {
            await this.saveConversation(
              requestData?.conversationId,
              requestData?.projectId,
              messages,
              accumulatedContent
            )
          }
          break
        }
      }

      streamSession.end()
    } catch (error) {
      this.log('error', 'Error in streaming response', error)
      streamSession.emit('error', error)
    }
  }

  /**
   * Get conversation history from database
   */
  private async getConversationHistory(conversationId: string): Promise<{
    messages: ChatMessage[]
    context?: string
    systemPrompt?: string
  }> {
    try {
      const sqliteManager = this.databaseService.getSQLiteManager()

      // Get conversation messages
      const messages = await sqliteManager.queryAll<{
        role: string
        content: string
        created_at: string
      }>(
        'SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
      )

      return {
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
      }
    } catch (error) {
      this.log('warn', 'Failed to get conversation history', error)
      return { messages: [] }
    }
  }

  /**
   * Get RAG context for a query
   */
  private async getRAGContext(
    _query: string,
    _projectId: number
  ): Promise<{
    context: string
    sources: Array<{
      fileId: number
      filename: string
      snippet: string
      score: number
    }>
  }> {
    try {
      // const _vectorManager = this.databaseService.getVectorManager()

      // This would be implemented when the RAG service is created
      // For now, return empty context
      return {
        context: '',
        sources: [],
      }
    } catch (error) {
      this.log('warn', 'Failed to get RAG context', error)
      return { context: '', sources: [] }
    }
  }

  /**
   * Get project memories
   */
  private async getProjectMemories(projectId: number): Promise<string[]> {
    try {
      const sqliteManager = this.databaseService.getSQLiteManager()

      const memories = await sqliteManager.queryAll<{ content: string }>(
        'SELECT content FROM project_memories WHERE project_id = ? ORDER BY created_at ASC',
        [projectId]
      )

      return memories.map(memory => memory.content)
    } catch (error) {
      this.log('warn', 'Failed to get project memories', error)
      return []
    }
  }

  /**
   * Save conversation to database
   */
  private async saveConversation(
    conversationId: string | undefined,
    projectId: number | undefined,
    messages: ChatMessage[],
    assistantResponse: string
  ): Promise<string> {
    try {
      const sqliteManager = this.databaseService.getSQLiteManager()

      // Generate conversation ID if not provided
      const finalConversationId = conversationId || this.generateId()

      // Create conversation if it doesn't exist
      if (!conversationId) {
        await sqliteManager.execute(
          'INSERT OR IGNORE INTO conversations (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))',
          [finalConversationId, projectId, 'Untitled Chat']
        )
      }

      // Save user message
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()
      if (lastUserMessage) {
        await sqliteManager.execute(
          'INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, datetime("now"))',
          [finalConversationId, 'user', lastUserMessage.content]
        )
      }

      // Save assistant response
      await sqliteManager.execute(
        'INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, datetime("now"))',
        [finalConversationId, 'assistant', assistantResponse]
      )

      // Update conversation timestamp
      await sqliteManager.execute(
        'UPDATE conversations SET updated_at = datetime("now") WHERE id = ?',
        [finalConversationId]
      )

      return finalConversationId
    } catch (error) {
      this.log('error', 'Failed to save conversation', error)
      throw error
    }
  }

  /**
   * Update conversation title
   */
  private async updateConversationTitle(conversationId: string, title: string): Promise<void> {
    try {
      const sqliteManager = this.databaseService.getSQLiteManager()

      await sqliteManager.execute(
        'UPDATE conversations SET title = ?, updated_at = datetime("now") WHERE id = ?',
        [title, conversationId]
      )
    } catch (error) {
      this.log('error', 'Failed to update conversation title', error)
      throw error
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

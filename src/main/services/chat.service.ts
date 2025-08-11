import { DatabaseService } from './database.service'
import { LLMService } from './llm.service'
import type {
  ChatMessage,
  Conversation,
  Message,
  FileInfo,
  SendMessageRequest,
  EditMessageRequest,
  RegenerateMessageRequest,
  CreateConversationRequest,
  IPCError
} from '@shared'
import { IPC_ERROR_CODES } from '@shared'

// 聊天服务配置
export interface ChatServiceConfig {
  maxContextLength: number
  maxFileSize: number
  maxFilesPerMessage: number
  supportedFileTypes: string[]
  autoGenerateTitle: boolean
  titleGenerationThreshold: number
}

// 默认配置
const DEFAULT_CONFIG: ChatServiceConfig = {
  maxContextLength: 4000, // 最大上下文长度（token）
  maxFileSize: 1024 * 1024, // 1MB
  maxFilesPerMessage: 10,
  supportedFileTypes: ['.txt', '.md'],
  autoGenerateTitle: true,
  titleGenerationThreshold: 2 // 第2条消息后自动生成标题
}

// 上下文管理接口
export interface ConversationContext {
  messages: ChatMessage[]
  totalTokens: number
  hasFiles: boolean
  projectMemories?: string[]
}

/**
 * 聊天服务类
 * 负责对话管理、消息处理、文件导入等功能
 */
export class ChatService {
  private static instance: ChatService
  private dbService: DatabaseService
  private llmService: LLMService
  private config: ChatServiceConfig = DEFAULT_CONFIG

  private constructor() {
    this.dbService = DatabaseService.getInstance()
    this.llmService = LLMService.getInstance()
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<ChatServiceConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * 获取当前配置
   */
  getConfig(): ChatServiceConfig {
    return { ...this.config }
  }

  /**
   * 创建新对话
   */
  async createConversation(request: CreateConversationRequest): Promise<Conversation> {
    try {
      const db = this.dbService.getDB()
      const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const result = await db.execute({
        sql: `INSERT INTO conversations (id, project_id, title, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, request.projectId || null, request.title || '新对话', now, now]
      })

      if (result.rowsAffected === 0) {
        throw new Error('Failed to create conversation')
      }

      return {
        id,
        project_id: request.projectId,
        title: request.title || '新对话',
        created_at: now,
        updated_at: now
      }
    } catch (error: any) {
      console.error('Failed to create conversation:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to create conversation', error)
    }
  }

  /**
   * 获取对话列表
   */
  async getConversations(projectId?: string): Promise<Conversation[]> {
    try {
      const db = this.dbService.getDB()

      let sql = 'SELECT * FROM conversations'
      const args: any[] = []

      if (projectId) {
        sql += ' WHERE project_id = ?'
        args.push(projectId)
      } else {
        sql += ' WHERE project_id IS NULL'
      }

      sql += ' ORDER BY updated_at DESC'

      const result = await db.execute({ sql, args })

      return result.rows.map((row) => ({
        id: row.id as string,
        project_id: row.project_id as string | undefined,
        title: row.title as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string
      }))
    } catch (error: any) {
      console.error('Failed to get conversations:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to get conversations', error)
    }
  }

  /**
   * 获取对话详情
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const db = this.dbService.getDB()

      const result = await db.execute({
        sql: 'SELECT * FROM conversations WHERE id = ?',
        args: [conversationId]
      })

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id as string,
        project_id: row.project_id as string | undefined,
        title: row.title as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string
      }
    } catch (error: any) {
      console.error('Failed to get conversation:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to get conversation', error)
    }
  }

  /**
   * 更新对话
   */
  async updateConversation(
    conversationId: string,
    updates: { title?: string; projectId?: string }
  ): Promise<void> {
    try {
      const db = this.dbService.getDB()
      const now = new Date().toISOString()

      const setParts: string[] = ['updated_at = ?']
      const args: any[] = [now]

      if (updates.title !== undefined) {
        setParts.push('title = ?')
        args.push(updates.title)
      }

      if (updates.projectId !== undefined) {
        setParts.push('project_id = ?')
        args.push(updates.projectId)
      }

      args.push(conversationId)

      const result = await db.execute({
        sql: `UPDATE conversations SET ${setParts.join(', ')} WHERE id = ?`,
        args
      })

      if (result.rowsAffected === 0) {
        throw new Error('Conversation not found')
      }
    } catch (error: any) {
      console.error('Failed to update conversation:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to update conversation', error)
    }
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string): Promise<void> {
    try {
      const db = this.dbService.getDB()

      // 删除对话（消息会通过外键级联删除）
      const result = await db.execute({
        sql: 'DELETE FROM conversations WHERE id = ?',
        args: [conversationId]
      })

      if (result.rowsAffected === 0) {
        throw new Error('Conversation not found')
      }
    } catch (error: any) {
      console.error('Failed to delete conversation:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to delete conversation', error)
    }
  }

  /**
   * 移动对话到项目
   */
  async moveConversation(conversationId: string, projectId: string | null): Promise<void> {
    await this.updateConversation(conversationId, { projectId })
  }

  /**
   * 发送消息
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    try {
      // 验证文件
      if (request.files) {
        this.validateFiles(request.files)
      }

      // 处理文件内容
      const processedFiles = request.files ? await this.processFiles(request.files) : undefined

      // 保存用户消息
      const userMessage = await this.saveMessage({
        conversationId: request.conversationId,
        role: 'user',
        content: request.content,
        files: processedFiles
      })

      // 获取对话上下文
      const context = await this.buildConversationContext(request.conversationId)

      // 生成 AI 回复
      const aiResponse = await this.llmService.chat({
        messages: context.messages,
        temperature: request.metadata?.temperature,
        maxTokens: request.metadata?.maxTokens,
        conversationId: request.conversationId
      })

      // 保存 AI 回复
      const aiMessage = await this.saveMessage({
        conversationId: request.conversationId,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          usage: aiResponse.usage,
          parentMessageId: userMessage.id
        }
      })

      // 更新对话时间戳
      await this.updateConversation(request.conversationId, {})

      // 自动生成标题（如果需要）
      if (this.config.autoGenerateTitle) {
        await this.maybeGenerateTitle(request.conversationId)
      }

      return aiMessage
    } catch (error: any) {
      console.error('Failed to send message:', error)
      throw this.createError(IPC_ERROR_CODES.LLM_API_ERROR, 'Failed to send message', error)
    }
  }

  /**
   * 流式发送消息
   */
  async *sendMessageStream(
    request: SendMessageRequest
  ): AsyncGenerator<{ type: 'message' | 'token' | 'complete'; data: any }> {
    try {
      // 验证文件
      if (request.files) {
        this.validateFiles(request.files)
      }

      // 处理文件内容
      const processedFiles = request.files ? await this.processFiles(request.files) : undefined

      // 保存用户消息
      const userMessage = await this.saveMessage({
        conversationId: request.conversationId,
        role: 'user',
        content: request.content,
        files: processedFiles
      })

      yield { type: 'message', data: userMessage }

      // 获取对话上下文
      const context = await this.buildConversationContext(request.conversationId)

      // 流式生成 AI 回复
      let fullContent = ''
      let aiMessageId: string | null = null

      for await (const chunk of this.llmService.chatStream({
        messages: context.messages,
        temperature: request.metadata?.temperature,
        maxTokens: request.metadata?.maxTokens,
        conversationId: request.conversationId
      })) {
        if (chunk.type === 'start') {
          // 创建 AI 消息记录
          aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          yield { type: 'token', data: { id: aiMessageId, type: 'start' } }
        } else if (chunk.type === 'token' && chunk.content) {
          fullContent += chunk.content
          yield { type: 'token', data: { id: aiMessageId, content: chunk.content } }
        } else if (chunk.type === 'complete') {
          // 保存完整的 AI 回复
          const aiMessage = await this.saveMessage({
            conversationId: request.conversationId,
            role: 'assistant',
            content: fullContent,
            metadata: {
              model: chunk.metadata?.model,
              usage: chunk.metadata?.usage,
              parentMessageId: userMessage.id
            }
          })

          yield { type: 'complete', data: aiMessage }
          break
        } else if (chunk.type === 'error') {
          throw chunk.error
        }
      }

      // 更新对话时间戳
      await this.updateConversation(request.conversationId, {})

      // 自动生成标题（如果需要）
      if (this.config.autoGenerateTitle) {
        await this.maybeGenerateTitle(request.conversationId)
      }
    } catch (error: any) {
      console.error('Failed to send message stream:', error)
      throw this.createError(IPC_ERROR_CODES.LLM_API_ERROR, 'Failed to send message stream', error)
    }
  }

  /**
   * 编辑消息
   */
  async editMessage(request: EditMessageRequest): Promise<Message> {
    try {
      // 获取原消息
      const originalMessage = await this.getMessage(request.messageId)
      if (!originalMessage) {
        throw new Error('Message not found')
      }

      // 验证文件
      if (request.files) {
        this.validateFiles(request.files)
      }

      // 处理文件内容
      const processedFiles = request.files ? await this.processFiles(request.files) : undefined

      // 删除原消息之后的所有消息
      await this.deleteMessagesAfter(request.messageId)

      // 更新原消息
      await this.updateMessage(request.messageId, {
        content: request.content,
        files: processedFiles
      })

      // 获取更新后的消息
      const updatedMessage = await this.getMessage(request.messageId)
      if (!updatedMessage) {
        throw new Error('Failed to get updated message')
      }

      return updatedMessage
    } catch (error: any) {
      console.error('Failed to edit message:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to edit message', error)
    }
  }

  /**
   * 重新生成消息
   */
  async regenerateMessage(request: RegenerateMessageRequest): Promise<Message> {
    try {
      // 获取原消息
      const originalMessage = await this.getMessage(request.messageId)
      if (!originalMessage || originalMessage.role !== 'assistant') {
        throw new Error('Invalid message for regeneration')
      }

      // 删除原消息之后的所有消息（包括原消息）
      await this.deleteMessagesAfter(request.messageId, true)

      // 获取对话上下文
      const context = await this.buildConversationContext(originalMessage.conversation_id)

      // 生成新的 AI 回复
      const aiResponse = await this.llmService.chat({
        messages: context.messages,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        conversationId: originalMessage.conversation_id
      })

      // 保存新的 AI 回复
      const newMessage = await this.saveMessage({
        conversationId: originalMessage.conversation_id,
        role: 'assistant',
        content: aiResponse.content,
        metadata: {
          model: aiResponse.model,
          usage: aiResponse.usage,
          regenerated: true
        }
      })

      return newMessage
    } catch (error: any) {
      console.error('Failed to regenerate message:', error)
      throw this.createError(IPC_ERROR_CODES.LLM_API_ERROR, 'Failed to regenerate message', error)
    }
  }

  /**
   * 获取对话消息列表
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const db = this.dbService.getDB()

      const result = await db.execute({
        sql: 'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        args: [conversationId]
      })

      return result.rows.map((row) => ({
        id: row.id as string,
        conversation_id: row.conversation_id as string,
        role: row.role as 'user' | 'assistant',
        content: row.content as string,
        files: row.files ? JSON.parse(row.files as string) : undefined,
        created_at: row.created_at as string
      }))
    } catch (error: any) {
      console.error('Failed to get messages:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to get messages', error)
    }
  }

  /**
   * 获取单个消息
   */
  async getMessage(messageId: string): Promise<Message | null> {
    try {
      const db = this.dbService.getDB()

      const result = await db.execute({
        sql: 'SELECT * FROM messages WHERE id = ?',
        args: [messageId]
      })

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id as string,
        conversation_id: row.conversation_id as string,
        role: row.role as 'user' | 'assistant',
        content: row.content as string,
        files: row.files ? JSON.parse(row.files as string) : undefined,
        created_at: row.created_at as string
      }
    } catch (error: any) {
      console.error('Failed to get message:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to get message', error)
    }
  }

  /**
   * 保存消息
   */
  private async saveMessage(data: {
    conversationId: string
    role: 'user' | 'assistant'
    content: string
    files?: FileInfo[]
    metadata?: Record<string, any>
  }): Promise<Message> {
    try {
      const db = this.dbService.getDB()
      const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const result = await db.execute({
        sql: `INSERT INTO messages (id, conversation_id, role, content, files, metadata, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          data.conversationId,
          data.role,
          data.content,
          data.files ? JSON.stringify(data.files) : null,
          data.metadata ? JSON.stringify(data.metadata) : null,
          now
        ]
      })

      if (result.rowsAffected === 0) {
        throw new Error('Failed to save message')
      }

      return {
        id,
        conversation_id: data.conversationId,
        role: data.role,
        content: data.content,
        files: data.files,
        created_at: now
      }
    } catch (error: any) {
      console.error('Failed to save message:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to save message', error)
    }
  }

  /**
   * 更新消息
   */
  private async updateMessage(
    messageId: string,
    updates: { content?: string; files?: FileInfo[] }
  ): Promise<void> {
    try {
      const db = this.dbService.getDB()

      const setParts: string[] = []
      const args: any[] = []

      if (updates.content !== undefined) {
        setParts.push('content = ?')
        args.push(updates.content)
      }

      if (updates.files !== undefined) {
        setParts.push('files = ?')
        args.push(updates.files ? JSON.stringify(updates.files) : null)
      }

      args.push(messageId)

      const result = await db.execute({
        sql: `UPDATE messages SET ${setParts.join(', ')} WHERE id = ?`,
        args
      })

      if (result.rowsAffected === 0) {
        throw new Error('Message not found')
      }
    } catch (error: any) {
      console.error('Failed to update message:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to update message', error)
    }
  }

  /**
   * 删除指定消息之后的所有消息
   */
  private async deleteMessagesAfter(messageId: string, includeMessage = false): Promise<void> {
    try {
      const db = this.dbService.getDB()

      // 获取消息的时间戳
      const messageResult = await db.execute({
        sql: 'SELECT created_at, conversation_id FROM messages WHERE id = ?',
        args: [messageId]
      })

      if (messageResult.rows.length === 0) {
        throw new Error('Message not found')
      }

      const messageTime = messageResult.rows[0].created_at as string
      const conversationId = messageResult.rows[0].conversation_id as string

      // 删除之后的消息
      const operator = includeMessage ? '>=' : '>'
      await db.execute({
        sql: `DELETE FROM messages WHERE conversation_id = ? AND created_at ${operator} ?`,
        args: [conversationId, messageTime]
      })
    } catch (error: any) {
      console.error('Failed to delete messages after:', error)
      throw this.createError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to delete messages', error)
    }
  }

  /**
   * 构建对话上下文
   */
  private async buildConversationContext(conversationId: string): Promise<ConversationContext> {
    try {
      // 获取对话消息
      const messages = await this.getMessages(conversationId)

      // 转换为 ChatMessage 格式
      const chatMessages: ChatMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        files: msg.files
      }))

      // 计算总 token 数（简单估算）
      const totalTokens = chatMessages.reduce((sum, msg) => {
        return (
          sum +
          this.estimateTokens(msg.content) +
          (msg.files
            ? msg.files.reduce((fileSum, file) => fileSum + this.estimateTokens(file.content), 0)
            : 0)
        )
      }, 0)

      // 检查是否有文件
      const hasFiles = chatMessages.some((msg) => msg.files && msg.files.length > 0)

      return {
        messages: chatMessages,
        totalTokens,
        hasFiles
      }
    } catch (error: any) {
      console.error('Failed to build conversation context:', error)
      throw this.createError(
        IPC_ERROR_CODES.DB_QUERY_ERROR,
        'Failed to build conversation context',
        error
      )
    }
  }

  /**
   * 验证文件
   */
  private validateFiles(files: FileInfo[]): void {
    if (files.length > this.config.maxFilesPerMessage) {
      throw this.createError(
        IPC_ERROR_CODES.FILE_SIZE_EXCEEDED,
        `Too many files. Maximum: ${this.config.maxFilesPerMessage}`
      )
    }

    for (const file of files) {
      // 检查文件大小
      if (file.size > this.config.maxFileSize) {
        throw this.createError(
          IPC_ERROR_CODES.FILE_SIZE_EXCEEDED,
          `File "${file.name}" is too large. Maximum size: ${this.config.maxFileSize / 1024 / 1024}MB`
        )
      }

      // 检查文件类型
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
      if (!this.config.supportedFileTypes.includes(extension)) {
        throw this.createError(
          IPC_ERROR_CODES.FILE_TYPE_NOT_SUPPORTED,
          `File type "${extension}" is not supported. Supported types: ${this.config.supportedFileTypes.join(', ')}`
        )
      }
    }
  }

  /**
   * 处理文件内容
   */
  private async processFiles(files: FileInfo[]): Promise<FileInfo[]> {
    // 对于临时文件，只需要读取内容，不需要存储
    return files.map((file) => ({
      ...file,
      content: file.content // 内容已经在前端读取
    }))
  }

  /**
   * 自动生成标题
   */
  private async maybeGenerateTitle(conversationId: string): Promise<void> {
    try {
      const messages = await this.getMessages(conversationId)

      // 检查是否需要生成标题
      if (messages.length < this.config.titleGenerationThreshold) {
        return
      }

      const conversation = await this.getConversation(conversationId)
      if (!conversation || conversation.title !== '新对话') {
        return // 已经有自定义标题了
      }

      // 生成标题
      const chatMessages: ChatMessage[] = messages.slice(0, 4).map((msg) => ({
        role: msg.role,
        content: msg.content
      }))

      const title = await this.llmService.generateTitle({ messages: chatMessages })

      // 更新对话标题
      await this.updateConversation(conversationId, { title })
    } catch (error: any) {
      console.warn('Failed to generate title:', error)
      // 标题生成失败不应该影响主流程
    }
  }

  /**
   * 估算 token 数量
   */
  private estimateTokens(text: string): number {
    // 简单估算：中文字符约1个token，英文单词约0.75个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0).length

    return Math.ceil(chineseChars + englishWords * 0.75)
  }

  /**
   * 创建标准化错误
   */
  private createError(code: string, message: string, details?: any): IPCError {
    return {
      code,
      message,
      details,
      stack: new Error().stack
    }
  }
}

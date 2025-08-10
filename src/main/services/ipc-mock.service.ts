import type {
  IPCHandler,
  IPCStreamHandler,
  IPCError,
  Project,
  Conversation,
  Message,
  ProjectMemory,
  KnowledgeCard,
  AppSettings,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateConversationRequest,
  SendMessageRequest,
  EditMessageRequest,
  UploadFileRequest,
  SearchRequest,
  EmbeddingRequest,
  ChatRequest
} from '@shared'
import { IPC_CHANNELS, IPC_ERROR_CODES } from '@shared'
import { MockService } from './mock.service'
import { OpenAIMockService } from './openai-mock.service'
import { IPCService } from './ipc.service'

// IPC Mock 配置
export interface IPCMockConfig {
  enabled: boolean
  autoRegister: boolean
  overrideExisting: boolean
  logRequests: boolean
  validateResponses: boolean
}

// 默认配置
const DEFAULT_IPC_MOCK_CONFIG: IPCMockConfig = {
  enabled: true,
  autoRegister: true,
  overrideExisting: false,
  logRequests: true,
  validateResponses: true
}

// IPC Mock 服务
export class IPCMockService {
  private static instance: IPCMockService
  private config: IPCMockConfig = DEFAULT_IPC_MOCK_CONFIG
  private mockService: MockService
  private openaiMockService: OpenAIMockService
  private ipcService: IPCService
  private registeredHandlers = new Set<string>()

  private constructor() {
    this.mockService = MockService.getInstance()
    this.openaiMockService = OpenAIMockService.getInstance()
    this.ipcService = IPCService.getInstance()
  }

  static getInstance(): IPCMockService {
    if (!IPCMockService.instance) {
      IPCMockService.instance = new IPCMockService()
    }
    return IPCMockService.instance
  }

  // 配置管理
  getConfig(): IPCMockConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<IPCMockConfig>): void {
    this.config = { ...this.config, ...updates }

    if (updates.enabled !== undefined) {
      if (updates.enabled && this.config.autoRegister) {
        this.registerAllHandlers()
      } else if (!updates.enabled) {
        this.unregisterAllHandlers()
      }
    }
  }

  // 初始化 Mock 服务
  initialize(): void {
    if (this.config.enabled && this.config.autoRegister) {
      this.registerAllHandlers()
    }
    console.log('✓ IPC Mock service initialized')
  }

  // 注册所有 Mock 处理器
  registerAllHandlers(): void {
    this.registerSystemHandlers()
    this.registerDatabaseHandlers()
    this.registerProjectHandlers()
    this.registerConversationHandlers()
    this.registerMessageHandlers()
    this.registerFileHandlers()
    this.registerLLMHandlers()
    this.registerRAGHandlers()
    this.registerKnowledgeHandlers()
    this.registerSearchHandlers()
    this.registerSettingsHandlers()

    console.log(`✓ Registered ${this.registeredHandlers.size} IPC mock handlers`)
  }

  // 注销所有 Mock 处理器
  unregisterAllHandlers(): void {
    // Note: IPCService doesn't provide unregister method,
    // so we just clear our tracking set
    this.registeredHandlers.clear()
    console.log('✓ Unregistered all IPC mock handlers')
  }

  // 系统相关处理器
  private registerSystemHandlers(): void {
    this.registerHandler(IPC_CHANNELS.PING, {
      handle: async () => {
        await this.mockService.simulateDelay('short')
        return 'pong'
      }
    })

    this.registerHandler(IPC_CHANNELS.GET_APP_INFO, {
      handle: async () => {
        await this.mockService.simulateDelay('short')
        return this.mockService.generateSystemInfo()
      }
    })
  }

  // 数据库相关处理器
  private registerDatabaseHandlers(): void {
    this.registerHandler(IPC_CHANNELS.DB_HEALTH_CHECK, {
      handle: async () => {
        await this.mockService.simulateDelay('medium')

        if (this.mockService.shouldSimulateError()) {
          throw this.createMockError(
            IPC_ERROR_CODES.DB_CONNECTION_ERROR,
            'Database connection failed'
          )
        }

        return {
          status: 'healthy' as const,
          details: {
            connection: true,
            tables: [
              'projects',
              'conversations',
              'messages',
              'project_files',
              'text_chunks',
              'project_memories',
              'knowledge_cards',
              'app_settings'
            ],
            vectorSupport: true,
            dbPath: '/mock/path/knowlex.db'
          }
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_STATS, {
      handle: async () => {
        await this.mockService.simulateDelay('medium')
        return this.mockService.generateDatabaseStats()
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_INSERT_VECTOR, {
      handle: async (data: { chunkId: string; content: string; embedding: number[] }) => {
        await this.mockService.simulateDelay('short')

        if (this.mockService.shouldSimulateError()) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to insert vector')
        }

        return { success: true, chunkId: data.chunkId }
      },
      validate: (data) => {
        return (
          data &&
          typeof data.chunkId === 'string' &&
          typeof data.content === 'string' &&
          Array.isArray(data.embedding)
        )
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_SEARCH_VECTORS, {
      handle: async (data: { queryEmbedding: number[]; limit?: number; projectId?: string }) => {
        await this.mockService.simulateDelay('medium')

        if (this.mockService.shouldSimulateError()) {
          throw this.createMockError(IPC_ERROR_CODES.RAG_SEARCH_ERROR, 'Vector search failed')
        }

        return this.mockService.simulateRAGSearch(data.queryEmbedding, data.projectId, data.limit)
      },
      validate: (data) => {
        return data && Array.isArray(data.queryEmbedding)
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_DELETE_VECTOR, {
      handle: async (data: { chunkId: string }) => {
        await this.mockService.simulateDelay('short')
        return { success: true, chunkId: data.chunkId }
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_CREATE_SAMPLE, {
      handle: async () => {
        await this.mockService.simulateDelay('long')
        // Switch to a scenario with sample data
        this.mockService.switchScenario('default')
        return { success: true, message: 'Sample data created' }
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_CLEAR_ALL, {
      handle: async () => {
        await this.mockService.simulateDelay('long')
        // Switch to empty scenario
        this.mockService.switchScenario('empty')
        return { success: true, message: 'All data cleared' }
      }
    })

    this.registerHandler(IPC_CHANNELS.DB_RESET, {
      handle: async () => {
        await this.mockService.simulateDelay('long')
        // Reset to default scenario
        this.mockService.switchScenario('default')
        return { success: true, message: 'Database reset' }
      }
    })
  }

  // 项目相关处理器
  private registerProjectHandlers(): void {
    this.registerHandler(IPC_CHANNELS.PROJECT_CREATE, {
      handle: async (data: CreateProjectRequest) => {
        await this.mockService.simulateDelay('medium')

        if (this.mockService.shouldSimulateError()) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Failed to create project')
        }

        const project: Project = {
          id: `project-${Date.now()}`,
          name: data.name,
          description: data.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        return project
      },
      validate: (data) => {
        return data && typeof data.name === 'string' && data.name.trim().length > 0
      }
    })

    this.registerHandler(IPC_CHANNELS.PROJECT_LIST, {
      handle: async () => {
        await this.mockService.simulateDelay('short')
        return this.mockService.getProjects()
      }
    })

    this.registerHandler(IPC_CHANNELS.PROJECT_GET, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('short')

        const project = this.mockService.getProject(data.id)
        if (!project) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Project not found')
        }

        return project
      }
    })

    this.registerHandler(IPC_CHANNELS.PROJECT_UPDATE, {
      handle: async (data: UpdateProjectRequest) => {
        await this.mockService.simulateDelay('medium')

        const project = this.mockService.getProject(data.id)
        if (!project) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Project not found')
        }

        const updatedProject: Project = {
          ...project,
          name: data.name || project.name,
          description: data.description !== undefined ? data.description : project.description,
          updated_at: new Date().toISOString()
        }

        return updatedProject
      }
    })

    this.registerHandler(IPC_CHANNELS.PROJECT_DELETE, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('medium')

        const project = this.mockService.getProject(data.id)
        if (!project) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Project not found')
        }

        return { success: true, id: data.id }
      }
    })

    this.registerHandler(IPC_CHANNELS.PROJECT_STATS, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('short')
        return this.mockService.generateProjectStats(data.id)
      }
    })
  }

  // 对话相关处理器
  private registerConversationHandlers(): void {
    this.registerHandler(IPC_CHANNELS.CONVERSATION_CREATE, {
      handle: async (data: CreateConversationRequest) => {
        await this.mockService.simulateDelay('medium')

        const conversation: Conversation = {
          id: `conversation-${Date.now()}`,
          project_id: data.projectId,
          title: data.title || 'New Conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        return conversation
      }
    })

    this.registerHandler(IPC_CHANNELS.CONVERSATION_LIST, {
      handle: async (data?: { projectId?: string }) => {
        await this.mockService.simulateDelay('short')
        return this.mockService.getConversations(data?.projectId)
      }
    })

    this.registerHandler(IPC_CHANNELS.CONVERSATION_GET, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('short')

        const conversation = this.mockService.getConversation(data.id)
        if (!conversation) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Conversation not found')
        }

        return conversation
      }
    })

    this.registerHandler(IPC_CHANNELS.CONVERSATION_UPDATE, {
      handle: async (data: { id: string; title?: string; projectId?: string }) => {
        await this.mockService.simulateDelay('medium')

        const conversation = this.mockService.getConversation(data.id)
        if (!conversation) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Conversation not found')
        }

        const updatedConversation: Conversation = {
          ...conversation,
          title: data.title || conversation.title,
          project_id: data.projectId !== undefined ? data.projectId : conversation.project_id,
          updated_at: new Date().toISOString()
        }

        return updatedConversation
      }
    })

    this.registerHandler(IPC_CHANNELS.CONVERSATION_DELETE, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('medium')
        return { success: true, id: data.id }
      }
    })

    this.registerHandler(IPC_CHANNELS.CONVERSATION_MOVE, {
      handle: async (data: { id: string; projectId?: string }) => {
        await this.mockService.simulateDelay('medium')

        const conversation = this.mockService.getConversation(data.id)
        if (!conversation) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Conversation not found')
        }

        return {
          ...conversation,
          project_id: data.projectId,
          updated_at: new Date().toISOString()
        }
      }
    })
  }

  // 消息相关处理器
  private registerMessageHandlers(): void {
    this.registerStreamHandler(IPC_CHANNELS.MESSAGE_SEND, {
      handle: async (data: SendMessageRequest, emit, complete, error) => {
        try {
          // 模拟流式响应
          const generator = this.mockService.simulateStreamingResponse(data.content)

          for await (const chunk of generator) {
            emit(chunk)
          }

          complete()
        } catch (err) {
          error(this.createMockError(IPC_ERROR_CODES.LLM_API_ERROR, 'Message send failed'))
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.MESSAGE_LIST, {
      handle: async (data: { conversationId: string }) => {
        await this.mockService.simulateDelay('short')
        return this.mockService.getMessages(data.conversationId)
      }
    })

    this.registerHandler(IPC_CHANNELS.MESSAGE_EDIT, {
      handle: async (data: EditMessageRequest) => {
        await this.mockService.simulateDelay('medium')

        const message = this.mockService.getMessage(data.messageId)
        if (!message) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Message not found')
        }

        const updatedMessage: Message = {
          ...message,
          content: data.content,
          files: data.files?.map((f) => f.name),
          created_at: new Date().toISOString()
        }

        return updatedMessage
      }
    })

    this.registerHandler(IPC_CHANNELS.MESSAGE_DELETE, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('medium')
        return { success: true, id: data.id }
      }
    })

    this.registerHandler(IPC_CHANNELS.MESSAGE_REGENERATE, {
      handle: async (data: { messageId: string }) => {
        await this.mockService.simulateDelay('long')

        const message = this.mockService.getMessage(data.messageId)
        if (!message) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Message not found')
        }

        // 生成新的响应内容
        const newContent = await this.openaiMockService.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Regenerate response' }]
        })

        return {
          ...message,
          content: newContent.choices[0].message.content,
          created_at: new Date().toISOString()
        }
      }
    })
  }

  // 文件相关处理器
  private registerFileHandlers(): void {
    this.registerStreamHandler(IPC_CHANNELS.FILE_UPLOAD, {
      handle: async (data: UploadFileRequest, emit, complete, error) => {
        try {
          for (const file of data.files) {
            const generator = this.mockService.simulateFileProcessing(file.name)

            for await (const progress of generator) {
              emit(progress)
            }
          }

          complete()
        } catch (err) {
          error(this.createMockError(IPC_ERROR_CODES.FILE_PERMISSION_ERROR, 'File upload failed'))
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.FILE_LIST, {
      handle: async (data: { projectId: string }) => {
        await this.mockService.simulateDelay('short')
        return this.mockService.getProjectFiles(data.projectId)
      }
    })

    this.registerHandler(IPC_CHANNELS.FILE_GET, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('short')

        const file = this.mockService.getProjectFile(data.id)
        if (!file) {
          throw this.createMockError(IPC_ERROR_CODES.FILE_NOT_FOUND, 'File not found')
        }

        return file
      }
    })

    this.registerHandler(IPC_CHANNELS.FILE_DELETE, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('medium')
        return { success: true, id: data.id }
      }
    })

    this.registerHandler(IPC_CHANNELS.FILE_PREVIEW, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('short')

        const file = this.mockService.getProjectFile(data.id)
        if (!file) {
          throw this.createMockError(IPC_ERROR_CODES.FILE_NOT_FOUND, 'File not found')
        }

        return {
          id: file.id,
          filename: file.filename,
          content: `# ${file.filename}\n\nThis is mock content for the file preview.\n\nThe actual file content would be loaded here in a real implementation.`,
          contentType: 'text/markdown'
        }
      }
    })
  }

  // LLM 相关处理器
  private registerLLMHandlers(): void {
    this.registerHandler(IPC_CHANNELS.LLM_CHAT, {
      handle: async (data: ChatRequest) => {
        await this.mockService.simulateDelay('long')

        const response = await this.openaiMockService.createChatCompletion({
          model: data.model || 'gpt-3.5-turbo',
          messages: data.messages,
          temperature: data.temperature,
          max_tokens: data.maxTokens,
          stream: false
        })

        return {
          id: response.id,
          content: response.choices[0].message.content,
          role: 'assistant',
          usage: response.usage,
          model: response.model
        }
      }
    })

    this.registerStreamHandler(IPC_CHANNELS.LLM_STREAM, {
      handle: async (data: ChatRequest, emit, complete, error) => {
        try {
          const generator = this.openaiMockService.createChatCompletionStream({
            model: data.model || 'gpt-3.5-turbo',
            messages: data.messages,
            temperature: data.temperature,
            max_tokens: data.maxTokens,
            stream: true
          })

          for await (const chunk of generator) {
            if (chunk === '[DONE]') {
              complete()
              return
            }

            emit(chunk)
          }
        } catch (err) {
          error(this.createMockError(IPC_ERROR_CODES.LLM_API_ERROR, 'Streaming failed'))
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.LLM_EMBEDDING, {
      handle: async (data: EmbeddingRequest) => {
        await this.mockService.simulateDelay('medium')

        const response = await this.openaiMockService.createEmbedding({
          model: data.model || 'text-embedding-3-small',
          input: data.texts,
          dimensions: data.options?.dimensions
        })

        return {
          embeddings: response.data.map((item) => item.embedding),
          usage: response.usage,
          model: response.model
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.LLM_TEST_CONNECTION, {
      handle: async (data: { apiKey: string; baseURL?: string; model?: string }) => {
        return await this.openaiMockService.testConnection(data)
      }
    })
  }

  // RAG 相关处理器
  private registerRAGHandlers(): void {
    this.registerHandler(IPC_CHANNELS.RAG_SEARCH, {
      handle: async (data: { query: string; projectId?: string; limit?: number }) => {
        await this.mockService.simulateDelay('medium')

        // 生成查询向量（模拟）
        const queryEmbedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1)

        return this.mockService.simulateRAGSearch(queryEmbedding, data.projectId, data.limit)
      }
    })

    this.registerStreamHandler(IPC_CHANNELS.RAG_PROCESS_FILE, {
      handle: async (data: { fileId: string }, emit, complete, error) => {
        try {
          const file = this.mockService.getProjectFile(data.fileId)
          if (!file) {
            throw new Error('File not found')
          }

          const generator = this.mockService.simulateFileProcessing(file.filename)

          for await (const progress of generator) {
            emit(progress)
          }

          complete()
        } catch (err) {
          error(
            this.createMockError(IPC_ERROR_CODES.RAG_PROCESSING_ERROR, 'File processing failed')
          )
        }
      }
    })
  }

  // 知识管理相关处理器
  private registerKnowledgeHandlers(): void {
    this.registerHandler(IPC_CHANNELS.MEMORY_CREATE, {
      handle: async (data: { projectId: string; content: string; type?: 'user' | 'system' }) => {
        await this.mockService.simulateDelay('medium')

        const memory: ProjectMemory = {
          id: `memory-${Date.now()}`,
          project_id: data.projectId,
          type: data.type || 'user',
          content: data.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        return memory
      }
    })

    this.registerHandler(IPC_CHANNELS.MEMORY_LIST, {
      handle: async (data: { projectId: string }) => {
        await this.mockService.simulateDelay('short')
        return this.mockService.getProjectMemories(data.projectId)
      }
    })

    this.registerHandler(IPC_CHANNELS.MEMORY_UPDATE, {
      handle: async (data: { id: string; content: string }) => {
        await this.mockService.simulateDelay('medium')

        const memories = this.mockService.getProjectMemories('')
        const memory = memories.find((m) => m.id === data.id)

        if (!memory) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Memory not found')
        }

        return {
          ...memory,
          content: data.content,
          updated_at: new Date().toISOString()
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.MEMORY_DELETE, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('medium')
        return { success: true, id: data.id }
      }
    })

    this.registerHandler(IPC_CHANNELS.KNOWLEDGE_CREATE, {
      handle: async (data: {
        projectId: string
        title: string
        content: string
        tags?: string[]
      }) => {
        await this.mockService.simulateDelay('medium')

        const knowledgeCard: KnowledgeCard = {
          id: `knowledge-${Date.now()}`,
          project_id: data.projectId,
          title: data.title,
          content: data.content,
          tags: data.tags,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        return knowledgeCard
      }
    })

    this.registerHandler(IPC_CHANNELS.KNOWLEDGE_LIST, {
      handle: async (data: { projectId: string }) => {
        await this.mockService.simulateDelay('short')
        return this.mockService.getKnowledgeCards(data.projectId)
      }
    })

    this.registerHandler(IPC_CHANNELS.KNOWLEDGE_UPDATE, {
      handle: async (data: { id: string; title?: string; content?: string; tags?: string[] }) => {
        await this.mockService.simulateDelay('medium')

        const knowledgeCards = this.mockService.getKnowledgeCards('')
        const card = knowledgeCards.find((k) => k.id === data.id)

        if (!card) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Knowledge card not found')
        }

        return {
          ...card,
          title: data.title || card.title,
          content: data.content || card.content,
          tags: data.tags || card.tags,
          updated_at: new Date().toISOString()
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.KNOWLEDGE_DELETE, {
      handle: async (data: { id: string }) => {
        await this.mockService.simulateDelay('medium')
        return { success: true, id: data.id }
      }
    })
  }

  // 搜索相关处理器
  private registerSearchHandlers(): void {
    this.registerHandler(IPC_CHANNELS.SEARCH_GLOBAL, {
      handle: async (data: SearchRequest) => {
        await this.mockService.simulateDelay('medium')

        if (this.mockService.shouldSimulateError()) {
          throw this.createMockError(IPC_ERROR_CODES.DB_QUERY_ERROR, 'Search failed')
        }

        return this.mockService.simulateSearch(data.query, data.limit)
      }
    })
  }

  // 设置相关处理器
  private registerSettingsHandlers(): void {
    this.registerHandler(IPC_CHANNELS.SETTINGS_GET, {
      handle: async (data: { key: string }) => {
        await this.mockService.simulateDelay('short')

        const setting = this.mockService.getSetting(data.key)
        if (!setting) {
          return null
        }

        return {
          key: setting.key,
          value: JSON.parse(setting.value)
        }
      }
    })

    this.registerHandler(IPC_CHANNELS.SETTINGS_SET, {
      handle: async (data: { key: string; value: any }) => {
        await this.mockService.simulateDelay('short')

        const setting: AppSettings = {
          id: data.key,
          key: data.key,
          value: JSON.stringify(data.value),
          updated_at: new Date().toISOString()
        }

        return setting
      }
    })

    this.registerHandler(IPC_CHANNELS.SETTINGS_GET_ALL, {
      handle: async () => {
        await this.mockService.simulateDelay('short')

        const settings = this.mockService.getSettings()
        const result: Record<string, any> = {}

        settings.forEach((setting) => {
          result[setting.key] = JSON.parse(setting.value)
        })

        return result
      }
    })
  }

  // 工具方法
  private registerHandler<TRequest = unknown, TResponse = unknown>(
    channel: string,
    handler: IPCHandler<TRequest, TResponse>
  ): void {
    if (!this.config.enabled) return

    if (this.registeredHandlers.has(channel) && !this.config.overrideExisting) {
      console.warn(`⚠️  Handler for channel '${channel}' already exists, skipping`)
      return
    }

    // 包装处理器以添加日志和验证
    const wrappedHandler: IPCHandler<TRequest, TResponse> = {
      handle: async (data: TRequest) => {
        if (this.config.logRequests) {
          console.log(`📨 Mock IPC request: ${channel}`, data)
        }

        const result = await handler.handle(data)

        if (this.config.logRequests) {
          console.log(`📤 Mock IPC response: ${channel}`, result)
        }

        return result
      },
      validate: handler.validate
    }

    this.ipcService.handle(channel, wrappedHandler)
    this.registeredHandlers.add(channel)
  }

  private registerStreamHandler<TRequest = unknown, TData = unknown>(
    channel: string,
    handler: IPCStreamHandler<TRequest, TData>
  ): void {
    if (!this.config.enabled) return

    if (this.registeredHandlers.has(channel) && !this.config.overrideExisting) {
      console.warn(`⚠️  Stream handler for channel '${channel}' already exists, skipping`)
      return
    }

    // 包装流式处理器以添加日志
    const wrappedHandler: IPCStreamHandler<TRequest, TData> = {
      handle: async (data: TRequest, emit, complete, error) => {
        if (this.config.logRequests) {
          console.log(`📨 Mock IPC stream request: ${channel}`, data)
        }

        const wrappedEmit = (streamData: TData) => {
          if (this.config.logRequests) {
            console.log(`📤 Mock IPC stream data: ${channel}`, streamData)
          }
          emit(streamData)
        }

        const wrappedComplete = () => {
          if (this.config.logRequests) {
            console.log(`✅ Mock IPC stream complete: ${channel}`)
          }
          complete()
        }

        const wrappedError = (err: IPCError) => {
          if (this.config.logRequests) {
            console.log(`❌ Mock IPC stream error: ${channel}`, err)
          }
          error(err)
        }

        await handler.handle(data, wrappedEmit, wrappedComplete, wrappedError)
      },
      validate: handler.validate
    }

    this.ipcService.handleStream(channel, wrappedHandler)
    this.registeredHandlers.add(channel)
  }

  private createMockError(code: string, message: string): IPCError {
    return {
      code,
      message,
      details: {
        mockError: true,
        timestamp: new Date().toISOString()
      }
    }
  }

  // 获取注册状态
  getRegisteredHandlers(): string[] {
    return Array.from(this.registeredHandlers)
  }

  isHandlerRegistered(channel: string): boolean {
    return this.registeredHandlers.has(channel)
  }

  // 获取 Mock 服务实例（用于高级用法）
  getMockService(): MockService {
    return this.mockService
  }

  getOpenAIMockService(): OpenAIMockService {
    return this.openaiMockService
  }
}

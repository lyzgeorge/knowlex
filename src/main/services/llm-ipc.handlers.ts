import { IPCService } from './ipc.service'
import { LLMService } from './llm.service'
import { ChatService } from './chat.service'
// import { EmbeddingService } from './embedding.service' // TODO: Add embedding handlers
import type {
  ChatRequest,
  SendMessageRequest,
  EditMessageRequest,
  RegenerateMessageRequest,
  CreateConversationRequest,
  EmbeddingRequest,
  ConnectionTestResult,
  LLMConfig
} from '@shared'
import { IPC_CHANNELS, IPC_STREAM_CHANNELS } from '@shared'

/**
 * 注册所有 LLM 相关的 IPC 处理器
 */
export function registerLLMHandlers(): void {
  const ipcService = IPCService.getInstance()
  const llmService = LLMService.getInstance()
  const chatService = ChatService.getInstance()
  // const embeddingService = EmbeddingService.getInstance() // TODO: Add embedding handlers

  // LLM 配置和连接测试
  ipcService.handle(IPC_CHANNELS.LLM_TEST_CONNECTION, {
    async handle(config: Partial<LLMConfig>): Promise<ConnectionTestResult> {
      // Update the service config with the test config
      if (config.apiKey) {
        await llmService.updateConfig(config)
      }
      return await llmService.testConnection(config)
    },
    validate(data: any): boolean {
      return data && typeof data === 'object' && typeof data.apiKey === 'string'
    }
  })

  // 非流式聊天
  ipcService.handle(IPC_CHANNELS.LLM_CHAT, {
    async handle(request: ChatRequest) {
      return await llmService.chat(request)
    },
    validate(data: any): boolean {
      return data && Array.isArray(data.messages) && data.messages.length > 0
    }
  })

  // 嵌入生成
  ipcService.handle(IPC_CHANNELS.LLM_EMBEDDING, {
    async handle(request: EmbeddingRequest) {
      return await llmService.generateEmbeddings(request)
    },
    validate(data: any): boolean {
      return data && Array.isArray(data.texts) && data.texts.length > 0
    }
  })

  // 流式聊天
  ipcService.handleStream(IPC_CHANNELS.LLM_STREAM, {
    async handle(request: ChatRequest, emit, complete, error) {
      try {
        // Update config if needed (for API key)
        const currentConfig = llmService.getConfig()
        if (!currentConfig?.apiKey && request.model) {
          // This is a fallback - the client should have already set the config
          console.warn('LLM stream called without initialized service')
          error({
            code: 'LLM_INVALID_CONFIG',
            message: 'LLM service not properly configured',
            details: 'API key not set'
          })
          return
        }

        for await (const chunk of llmService.chatStream(request)) {
          emit(chunk)
        }
        complete()
      } catch (err: any) {
        error({
          code: 'LLM_STREAM_ERROR',
          message: err.message || 'Stream failed',
          details: err
        })
      }
    },
    validate(data: any): boolean {
      return data && Array.isArray(data.messages) && data.messages.length > 0
    }
  })

  // 对话管理
  ipcService.handle(IPC_CHANNELS.CONVERSATION_CREATE, {
    async handle(request: CreateConversationRequest) {
      return await chatService.createConversation(request)
    },
    validate(data: any): boolean {
      return data && typeof data === 'object'
    }
  })

  ipcService.handle(IPC_CHANNELS.CONVERSATION_LIST, {
    async handle(projectId?: string) {
      return await chatService.getConversations(projectId)
    }
  })

  ipcService.handle(IPC_CHANNELS.CONVERSATION_GET, {
    async handle(conversationId: string) {
      return await chatService.getConversation(conversationId)
    },
    validate(data: any): boolean {
      return typeof data === 'string' && data.length > 0
    }
  })

  ipcService.handle(IPC_CHANNELS.CONVERSATION_UPDATE, {
    async handle({ conversationId, updates }: { conversationId: string; updates: any }) {
      await chatService.updateConversation(conversationId, updates)
      return { success: true }
    },
    validate(data: any): boolean {
      return data && typeof data.conversationId === 'string' && typeof data.updates === 'object'
    }
  })

  ipcService.handle(IPC_CHANNELS.CONVERSATION_DELETE, {
    async handle(conversationId: string) {
      await chatService.deleteConversation(conversationId)
      return { success: true }
    },
    validate(data: any): boolean {
      return typeof data === 'string' && data.length > 0
    }
  })

  ipcService.handle(IPC_CHANNELS.CONVERSATION_MOVE, {
    async handle({
      conversationId,
      projectId
    }: {
      conversationId: string
      projectId: string | null
    }) {
      await chatService.moveConversation(conversationId, projectId)
      return { success: true }
    },
    validate(data: any): boolean {
      return data && typeof data.conversationId === 'string'
    }
  })

  // 消息管理
  ipcService.handle(IPC_CHANNELS.MESSAGE_SEND, {
    async handle(request: SendMessageRequest) {
      return await chatService.sendMessage(request)
    },
    validate(data: any): boolean {
      return data && typeof data.conversationId === 'string' && typeof data.content === 'string'
    }
  })

  ipcService.handle(IPC_CHANNELS.MESSAGE_LIST, {
    async handle(conversationId: string) {
      return await chatService.getMessages(conversationId)
    },
    validate(data: any): boolean {
      return typeof data === 'string' && data.length > 0
    }
  })

  ipcService.handle(IPC_CHANNELS.MESSAGE_EDIT, {
    async handle(request: EditMessageRequest) {
      return await chatService.editMessage(request)
    },
    validate(data: any): boolean {
      return data && typeof data.messageId === 'string' && typeof data.content === 'string'
    }
  })

  ipcService.handle(IPC_CHANNELS.MESSAGE_REGENERATE, {
    async handle(request: RegenerateMessageRequest) {
      return await chatService.regenerateMessage(request)
    },
    validate(data: any): boolean {
      return data && typeof data.messageId === 'string'
    }
  })

  // 流式消息发送
  ipcService.handleStream(IPC_STREAM_CHANNELS.LLM_STREAM_RESPONSE, {
    async handle(request: SendMessageRequest, emit, complete, error) {
      try {
        for await (const chunk of chatService.sendMessageStream(request)) {
          emit(chunk)
        }
        complete()
      } catch (err: any) {
        error({
          code: 'MESSAGE_STREAM_ERROR',
          message: err.message || 'Message stream failed',
          details: err
        })
      }
    },
    validate(data: any): boolean {
      return data && typeof data.conversationId === 'string' && typeof data.content === 'string'
    }
  })

  console.log('✓ LLM IPC handlers registered successfully')
}

/**
 * 初始化 LLM 服务配置
 */
export async function initializeLLMService(config: LLMConfig): Promise<void> {
  const llmService = LLMService.getInstance()
  await llmService.initialize(config)
  console.log('✓ LLM service initialized with config')
}

/**
 * 更新 LLM 服务配置
 */
export async function updateLLMConfig(updates: Partial<LLMConfig>): Promise<void> {
  const llmService = LLMService.getInstance()
  await llmService.updateConfig(updates)
  console.log('✓ LLM service config updated')
}

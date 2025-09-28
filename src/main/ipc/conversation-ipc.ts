import { ipcMain } from 'electron'
import {
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  listConversationsPaginated,
  moveConversation
} from '@main/services/conversation'
import type { ConversationCreateInput, ConversationUpdateInput } from '@main/domain/conversation'
import { getMessage, getMessages, updateMessage, deleteMessage } from '@main/services/message'
import type { IPCResult } from '@shared/types/ipc'
import type { Conversation, SessionSettings } from '@shared/types/conversation-types'
import type { Message, MessageContent } from '@shared/types/message'
import { testOpenAIConfig } from '@main/infra/ai/openai-adapter'
import {
  CONVERSATION_CHANNELS,
  MESSAGE_CHANNELS,
  AI_CHANNELS
} from '@shared/constants/ipc-channels'
import { regenerateReply } from '@main/services/assistant-service'
import { cancellationManager } from '@main/infra/utils/cancellation'
import { handleIPCCall, requireValidId, parseWithSchema } from './common'
import { ensurePlaceholder } from '@shared/utils/text'
import { sendMessageEvent, MESSAGE_EVENTS } from '@main/infra/utils/ipc-events'
import {
  ConversationCreateRequestSchema,
  ConversationListRequestSchema,
  ConversationUpdateRequestSchema,
  ConversationMoveRequestSchema,
  SessionSettingsInput
} from '@shared/schemas/conversation'
import { MessageSendRequestSchema, MessageUpdateRequestSchema } from '@shared/schemas/message'

function normalizeSessionSettings(
  settings: SessionSettingsInput | undefined
): SessionSettings | undefined {
  if (settings === undefined) return undefined
  const normalized: SessionSettings = {}
  if (settings.systemPrompt !== undefined) normalized.systemPrompt = settings.systemPrompt
  if (settings.temperature !== undefined) normalized.temperature = settings.temperature
  return normalized
}

// Registration
export function registerConversationIPCHandlers(): void {
  console.log('Registering conversation and message IPC handlers...')

  // Create conversation
  ipcMain.handle(
    CONVERSATION_CHANNELS.create,
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        const payload = parseWithSchema(
          ConversationCreateRequestSchema,
          data ?? {},
          'Invalid conversation creation data'
        )
        const createData: ConversationCreateInput = {}
        if (payload.title !== undefined) createData.title = payload.title
        const normalizedSettings = normalizeSessionSettings(payload.settings)
        if (normalizedSettings !== undefined) createData.settings = normalizedSettings
        if (payload.projectId !== undefined) createData.projectId = payload.projectId
        if (payload.modelConfigId !== undefined) createData.modelConfigId = payload.modelConfigId
        return await createConversation(createData)
      })
    }
  )

  // List conversations paginated
  ipcMain.handle(
    CONVERSATION_CHANNELS.listPaginated,
    async (
      _,
      data: unknown
    ): Promise<IPCResult<{ conversations: Conversation[]; hasMore: boolean }>> => {
      return handleIPCCall(async () => {
        const request = parseWithSchema(
          ConversationListRequestSchema,
          data ?? {},
          'Invalid pagination data'
        )
        const limit = request.limit ?? 15
        const offset = request.offset ?? 0
        return await listConversationsPaginated(limit, offset)
      })
    }
  )

  // Get conversation
  ipcMain.handle(
    CONVERSATION_CHANNELS.get,
    async (_, id: unknown): Promise<IPCResult<Conversation | null>> => {
      return handleIPCCall(async () => {
        const conversationId = requireValidId(id, 'Conversation ID')
        return await getConversation(conversationId)
      })
    }
  )

  // Update conversation
  ipcMain.handle(
    CONVERSATION_CHANNELS.update,
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        const requestData = parseWithSchema(
          ConversationUpdateRequestSchema,
          data,
          'Invalid conversation update data'
        )
        const updateData: ConversationUpdateInput = {}
        if (requestData.title !== undefined) updateData.title = requestData.title
        if (requestData.settings !== undefined) {
          const normalizedSettings = normalizeSessionSettings(requestData.settings)
          if (normalizedSettings !== undefined) {
            updateData.settings = normalizedSettings
          }
        }
        if (requestData.projectId !== undefined) updateData.projectId = requestData.projectId
        if (requestData.modelConfigId !== undefined)
          updateData.modelConfigId = requestData.modelConfigId
        return await updateConversation(requestData.id, updateData)
      })
    }
  )

  // Conversation: delete
  ipcMain.handle(CONVERSATION_CHANNELS.delete, async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const conversationId = requireValidId(id, 'Conversation ID')
      await deleteConversation(conversationId)
    })
  })

  // Conversation: move
  ipcMain.handle(
    CONVERSATION_CHANNELS.move,
    async (_, data: unknown): Promise<IPCResult<boolean>> => {
      return handleIPCCall(async () => {
        const request = parseWithSchema(
          ConversationMoveRequestSchema,
          data,
          'Invalid conversation move data'
        )
        const targetProjectId = request.projectId ?? null
        await moveConversation(request.conversationId, targetProjectId)
        return true
      })
    }
  )

  // Get message
  ipcMain.handle(
    MESSAGE_CHANNELS.get,
    async (_, id: unknown): Promise<IPCResult<Message | null>> => {
      return handleIPCCall(async () => {
        const messageId = requireValidId(id, 'Message ID')
        return await getMessage(messageId)
      })
    }
  )

  // Message: list
  ipcMain.handle(
    MESSAGE_CHANNELS.list,
    async (_, conversationId: unknown): Promise<IPCResult<Message[]>> => {
      return handleIPCCall(async () => {
        const validConversationId = requireValidId(conversationId, 'Conversation ID')
        return await getMessages(validConversationId)
      })
    }
  )

  // Message: update
  ipcMain.handle(MESSAGE_CHANNELS.update, async (_, data: unknown): Promise<IPCResult<Message>> => {
    return handleIPCCall(async () => {
      const request = parseWithSchema(
        MessageUpdateRequestSchema,
        data,
        'Invalid message update data'
      )
      return await updateMessage(request.id, { content: request.content as MessageContent })
    })
  })

  // Message: delete
  ipcMain.handle(MESSAGE_CHANNELS.delete, async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const messageId = requireValidId(id, 'Message ID')
      cancellationManager.cancel(messageId)
      await deleteMessage(messageId)
    })
  })

  // Message: stop streaming
  ipcMain.handle(
    MESSAGE_CHANNELS.stop,
    async (_, messageId: unknown): Promise<IPCResult<boolean>> => {
      return handleIPCCall(async () => {
        const validMessageId = requireValidId(messageId, 'Message ID')
        const cancelled = cancellationManager.cancel(validMessageId)
        if (cancelled) {
          console.log(`Cancelled streaming for message: ${validMessageId}`)
          sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, { messageId: validMessageId })
        }
        return cancelled
      })
    }
  )

  // Message: send (streaming)
  ipcMain.handle(MESSAGE_CHANNELS.send, async (_, data: unknown): Promise<IPCResult<Message[]>> => {
    return handleIPCCall(async () => {
      const request = parseWithSchema(MessageSendRequestSchema, data, 'Invalid send message data')
      const { sendMessageAndGenerateReply } = await import('@main/services/message-send')
      await sendMessageAndGenerateReply({
        content: request.content as MessageContent,
        reasoningEffort: request.reasoningEffort,
        conversationId: request.conversationId ?? undefined,
        parentMessageId: request.parentMessageId ?? undefined,
        projectId: request.projectId ?? undefined,
        modelConfigId: request.modelConfigId ?? undefined
      })
      return []
    })
  })

  // Message: regenerate assistant reply
  ipcMain.handle(
    MESSAGE_CHANNELS.regenerate,
    async (_, messageId: unknown): Promise<IPCResult<Message>> => {
      return handleIPCCall(async () => {
        const validMessageId = requireValidId(messageId, 'Message ID')
        const message = await getMessage(validMessageId)
        if (!message) throw new Error('Message not found')
        if (message.role !== 'assistant') {
          throw new Error('Can only regenerate assistant messages')
        }
        const clearedMessage = await updateMessage(validMessageId, {
          content: [{ type: 'text' as const, text: ensurePlaceholder('') }],
          reasoning: ''
        })
        await regenerateReply(validMessageId)
        return clearedMessage
      })
    }
  )

  // AI: test connection
  ipcMain.handle(
    AI_CHANNELS.testConnection,
    async (): Promise<IPCResult<{ success: boolean; error?: string; model?: string }>> => {
      return handleIPCCall(async () => {
        return await testOpenAIConfig()
      })
    }
  )

  console.log('Conversation and message IPC handlers registered successfully')
}

export function unregisterConversationIPCHandlers(): void {
  console.log('Unregistering conversation and message IPC handlers...')
  const channels = [
    CONVERSATION_CHANNELS.create,
    CONVERSATION_CHANNELS.listPaginated,
    CONVERSATION_CHANNELS.get,
    CONVERSATION_CHANNELS.update,
    CONVERSATION_CHANNELS.delete,
    CONVERSATION_CHANNELS.move,
    MESSAGE_CHANNELS.get,
    MESSAGE_CHANNELS.list,
    MESSAGE_CHANNELS.update,
    MESSAGE_CHANNELS.delete,
    MESSAGE_CHANNELS.stop,
    MESSAGE_CHANNELS.send,
    MESSAGE_CHANNELS.regenerate,
    AI_CHANNELS.testConnection
  ]
  channels.forEach((channel) => ipcMain.removeAllListeners(channel))
  console.log('Conversation and message IPC handlers unregistered')
}

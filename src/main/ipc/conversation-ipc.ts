import { ipcMain } from 'electron'
import {
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  listConversationsPaginated,
  moveConversation,
  type CreateConversationData,
  type UpdateConversationData
} from '@main/services/conversation-service'
import { getMessage, getMessages, updateMessage, deleteMessage } from '@main/services/message'
import type { IPCResult, ConversationCreateRequest } from '@shared/types/ipc'
import type { Conversation, SessionSettings } from '@shared/types/conversation-types'
import type { Message } from '@shared/types/message'
import { testOpenAIConfig } from '@main/services/openai-adapter'
import { regenerateReply } from '@main/services/assistant-service'
import { cancellationManager } from '@main/utils/cancellation'

// Shared validation utilities
import {
  handleIPCCall,
  validateRequest,
  requireValidId,
  ValidationPatterns,
  validateObject,
  validateStringProperty,
  expectObject,
  expectString
} from './common'
import { ensurePlaceholder } from '@shared/utils/text'
import { sendMessageEvent, MESSAGE_EVENTS } from '@main/utils/ipc-events'
import { validateReasoningEffort } from '@shared/reasoning/policy'

// Validation helpers
function validateConversationCreateRequest(data: unknown): data is ConversationCreateRequest {
  if (!validateObject(data)) return false
  const request = data as ConversationCreateRequest
  return request.title === undefined || typeof request.title === 'string'
}

function validateConversationUpdateData(data: unknown): data is {
  id: string
  title?: string
  settings?: SessionSettings
} {
  if (!validateObject(data)) return false
  const request = data as any
  return (
    ValidationPatterns.conversationId(request.id) &&
    validateStringProperty(request, 'title', false) &&
    (request.settings === undefined ||
      (typeof request.settings === 'object' && request.settings !== null)) &&
    (request.modelConfigId === undefined || ValidationPatterns.modelConfigId(request.modelConfigId))
  )
}

// Registration
export function registerConversationIPCHandlers(): void {
  console.log('Registering conversation and message IPC handlers...')

  // Create conversation
  ipcMain.handle(
    'conversation:create',
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        const requestData = validateRequest(
          data,
          validateConversationCreateRequest,
          'Invalid conversation creation data'
        )
        const createData: CreateConversationData = {}
        if (requestData.title !== undefined) createData.title = requestData.title
        if ((requestData as any).projectId !== undefined)
          (createData as any).projectId = (requestData as any).projectId
        return await createConversation(createData)
      })
    }
  )

  // List conversations paginated
  ipcMain.handle(
    'conversation:list-paginated',
    async (
      _,
      data: unknown
    ): Promise<IPCResult<{ conversations: Conversation[]; hasMore: boolean }>> => {
      return handleIPCCall(async () => {
        const request = expectObject<{ limit?: number; offset?: number }>(
          data,
          'Invalid pagination data'
        )
        const limit = typeof request.limit === 'number' && request.limit > 0 ? request.limit : 15
        const offset =
          typeof request.offset === 'number' && request.offset >= 0 ? request.offset : 0
        if (limit > 50) {
          throw new Error('Limit cannot exceed 50 conversations')
        }
        return await listConversationsPaginated(limit, offset)
      })
    }
  )

  // Get conversation
  ipcMain.handle(
    'conversation:get',
    async (_, id: unknown): Promise<IPCResult<Conversation | null>> => {
      return handleIPCCall(async () => {
        const conversationId = expectString(id, 'Conversation ID')
        return await getConversation(conversationId)
      })
    }
  )

  // Update conversation
  ipcMain.handle(
    'conversation:update',
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        const requestObj: any = data
        if (!requestObj || typeof requestObj !== 'object' || !('id' in requestObj)) {
          throw new Error('Invalid conversation update data')
        }
        const requestData = validateRequest(
          requestObj,
          validateConversationUpdateData,
          'Invalid conversation update data'
        )
        const updateData: UpdateConversationData = {}
        if (requestData.title !== undefined) updateData.title = requestData.title
        if (requestData.settings !== undefined) updateData.settings = requestData.settings
        if ((requestData as any).modelConfigId !== undefined)
          (updateData as any).modelConfigId = (requestData as any).modelConfigId
        return await updateConversation(requestData.id, updateData)
      })
    }
  )

  // Conversation: delete
  ipcMain.handle('conversation:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const conversationId = requireValidId(id, 'Conversation ID')
      await deleteConversation(conversationId)
    })
  })

  // Removed: manual title generation. Auto-generation runs after first exchange.

  // Conversation: move
  ipcMain.handle(
    'conversation:move',
    async (_, conversationId: unknown, projectId: unknown): Promise<IPCResult<boolean>> => {
      return handleIPCCall(async () => {
        const validConversationId = requireValidId(conversationId, 'Conversation ID')
        const targetProjectId = projectId === null ? null : String(projectId)
        await moveConversation(validConversationId, targetProjectId)
        return true
      })
    }
  )

  // Get message
  ipcMain.handle('message:get', async (_, id: unknown): Promise<IPCResult<Message | null>> => {
    return handleIPCCall(async () => {
      if (!ValidationPatterns.messageId(id)) {
        throw new Error('Invalid message ID')
      }
      return await getMessage(id)
    })
  })

  // Message: list
  ipcMain.handle(
    'message:list',
    async (_, conversationId: unknown): Promise<IPCResult<Message[]>> => {
      return handleIPCCall(async () => {
        if (!ValidationPatterns.conversationId(conversationId)) {
          throw new Error('Invalid conversation ID')
        }
        return await getMessages(conversationId)
      })
    }
  )

  // Message: update
  ipcMain.handle('message:update', async (_, data: unknown): Promise<IPCResult<Message>> => {
    return handleIPCCall(async () => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid message update data')
      }
      const request = data as any
      if (!ValidationPatterns.messageId(request.id)) {
        throw new Error('Invalid message ID')
      }
      if (!ValidationPatterns.messageContent(request.content)) {
        throw new Error('Invalid message content')
      }
      return await updateMessage(request.id, { content: request.content })
    })
  })

  // Message: delete
  ipcMain.handle('message:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      cancellationManager.cancel(String(id))
      if (!ValidationPatterns.messageId(id)) {
        throw new Error('Invalid message ID')
      }
      await deleteMessage(id)
    })
  })

  // Message: stop streaming
  ipcMain.handle('message:stop', async (_, messageId: unknown): Promise<IPCResult<boolean>> => {
    return handleIPCCall(async () => {
      if (!ValidationPatterns.messageId(messageId)) {
        throw new Error('Invalid message ID')
      }
      const cancelled = cancellationManager.cancel(messageId)
      if (cancelled) {
        console.log(`Cancelled streaming for message: ${messageId}`)
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, { messageId })
      }
      return cancelled
    })
  })

  // Message: send (streaming)
  ipcMain.handle('message:send', async (_, data: unknown): Promise<IPCResult<Message[]>> => {
    return handleIPCCall(async () => {
      const request = expectObject<{
        content: unknown
        reasoningEffort?: unknown
        conversationId?: unknown
        parentMessageId?: unknown
        projectId?: unknown
        modelConfigId?: unknown
      }>(data, 'Invalid send message data')
      if (!ValidationPatterns.messageContent(request.content)) {
        throw new Error('Invalid message content')
      }
      const validatedReasoningEffort = validateReasoningEffort(request.reasoningEffort)
      if (request.reasoningEffort !== undefined && validatedReasoningEffort === undefined) {
        throw new Error('Invalid reasoningEffort value')
      }
      const { sendMessageAndGenerateReply } = await import('@main/services/message-send')
      await sendMessageAndGenerateReply({
        content: request.content,
        reasoningEffort: validatedReasoningEffort,
        conversationId:
          typeof request.conversationId === 'string' && request.conversationId.trim().length > 0
            ? request.conversationId.trim()
            : undefined,
        parentMessageId:
          typeof request.parentMessageId === 'string' && request.parentMessageId.trim().length > 0
            ? request.parentMessageId.trim()
            : undefined,
        projectId:
          typeof request.projectId === 'string' && request.projectId.trim().length > 0
            ? request.projectId.trim()
            : undefined,
        modelConfigId:
          typeof request.modelConfigId === 'string' && request.modelConfigId.trim().length > 0
            ? request.modelConfigId.trim()
            : undefined
      })
      return []
    })
  })

  // Message: regenerate assistant reply
  ipcMain.handle(
    'message:regenerate',
    async (_, messageId: unknown): Promise<IPCResult<Message>> => {
      return handleIPCCall(async () => {
        if (!ValidationPatterns.messageId(messageId)) {
          throw new Error('Invalid message ID')
        }
        const message = await getMessage(messageId)
        if (!message) throw new Error('Message not found')
        if (message.role !== 'assistant') {
          throw new Error('Can only regenerate assistant messages')
        }
        const clearedMessage = await updateMessage(messageId, {
          content: [{ type: 'text' as const, text: ensurePlaceholder('') }],
          reasoning: ''
        })
        await regenerateReply(messageId)
        return clearedMessage
      })
    }
  )

  // AI: test connection
  ipcMain.handle(
    'ai:test-connection',
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
    'conversation:create',
    'conversation:list-paginated',
    'conversation:get',
    'conversation:update',
    'conversation:delete',
    'conversation:move',
    'message:get',
    'message:list',
    'message:update',
    'message:delete',
    'message:stop',
    'message:send',
    'message:regenerate',
    'ai:test-connection'
  ]
  channels.forEach((channel) => ipcMain.removeAllListeners(channel))
  console.log('Conversation and message IPC handlers unregistered')
}

import { ipcMain, BrowserWindow } from 'electron'
import {
  createConversation,
  getConversation,
  updateConversation,
  deleteConversation,
  generateConversationTitle,
  type CreateConversationData,
  type UpdateConversationData
} from '../services/conversation'
import {
  addMessage,
  getMessage,
  getMessages,
  updateMessage,
  deleteMessage
} from '../services/message'
import type { IPCResult, ConversationCreateRequest } from '../../shared/types/ipc'
import type { Conversation, SessionSettings } from '../../shared/types/conversation'
import type { Message, MessageContent } from '../../shared/types/message'
import { testOpenAIConfig } from '../services/openai-adapter'
import { regenerateReply } from '../services/assistant-service'
import { cancellationManager } from '../utils/cancellation'

/**
 * Conversation and Message IPC Handler
 * Handles secure communication between renderer and main processes for conversation and message operations
 * Provides error handling and validation for all conversation and message-related IPC calls
 */

import {
  handleIPCCall,
  validateRequest,
  requireValidId,
  ValidationPatterns,
  validateObject,
  validateStringProperty
} from './common'

/**
 * Validates conversation creation request data
 */
function validateConversationCreateRequest(data: unknown): data is ConversationCreateRequest {
  if (!validateObject(data)) return false
  const request = data as ConversationCreateRequest
  return request.title === undefined || typeof request.title === 'string'
}

/**
 * Validates conversation update data
 */
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
      (typeof request.settings === 'object' && request.settings !== null))
  )
}

// Temporary aliases for backward compatibility during migration
const validateConversationId = ValidationPatterns.conversationId
const validateMessageId = ValidationPatterns.messageId
const validateMessageContent = ValidationPatterns.messageContent

/**
 * Registers all conversation and message-related IPC handlers
 * Called during application initialization
 */
export function registerConversationIPCHandlers(): void {
  console.log('Registering conversation and message IPC handlers...')

  // ============================================================================
  // Conversation Handlers
  // ============================================================================

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

        return await createConversation(createData)
      })
    }
  )

  // Note: conversation:list removed - use conversation:list-paginated instead

  // List conversations with pagination
  ipcMain.handle(
    'conversation:list-paginated',
    async (
      _,
      data: unknown
    ): Promise<IPCResult<{ conversations: Conversation[]; hasMore: boolean }>> => {
      return handleIPCCall(async () => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid pagination data')
        }

        const request = data as any
        const limit = typeof request.limit === 'number' && request.limit > 0 ? request.limit : 15
        const offset =
          typeof request.offset === 'number' && request.offset >= 0 ? request.offset : 0

        if (limit > 50) {
          throw new Error('Limit cannot exceed 50 conversations')
        }

        // Import the service function
        const { listConversationsPaginated } = await import('../services/conversation')
        const result = await listConversationsPaginated(limit, offset)

        return result
      })
    }
  )

  // Get single conversation
  ipcMain.handle(
    'conversation:get',
    async (_, id: unknown): Promise<IPCResult<Conversation | null>> => {
      return handleIPCCall(async () => {
        const conversationId = requireValidId(id, 'Conversation ID')
        return await getConversation(conversationId)
      })
    }
  )

  // Update conversation
  ipcMain.handle(
    'conversation:update',
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        const requestData = validateRequest(
          data,
          validateConversationUpdateData,
          'Invalid conversation update data'
        )

        const updateData: UpdateConversationData = {}
        if (requestData.title !== undefined) updateData.title = requestData.title
        if (requestData.settings !== undefined) updateData.settings = requestData.settings

        return await updateConversation(requestData.id, updateData)
      })
    }
  )

  // Update conversation title (convenience method)
  ipcMain.handle(
    'conversation:update-title',
    async (_, conversationId: unknown, title: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        const validConversationId = requireValidId(conversationId, 'Conversation ID')

        if (!title || typeof title !== 'string' || title.trim().length === 0) {
          throw new Error('Invalid title')
        }

        return await updateConversation(validConversationId, {
          title: title.trim()
        })
      })
    }
  )

  // Delete conversation
  ipcMain.handle('conversation:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const conversationId = requireValidId(id, 'Conversation ID')
      await deleteConversation(conversationId)
    })
  })

  // Update conversation settings
  ipcMain.handle(
    'conversation:update-settings',
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid conversation settings data')
        }

        const request = data as any
        if (!validateConversationId(request.conversationId)) {
          throw new Error('Invalid conversation ID')
        }

        if (!request.settings || typeof request.settings !== 'object') {
          throw new Error('Invalid settings object')
        }

        return await updateConversation(request.conversationId, { settings: request.settings })
      })
    }
  )

  // Generate conversation title
  ipcMain.handle(
    'conversation:generate-title',
    async (_, id: unknown): Promise<IPCResult<string>> => {
      return handleIPCCall(async () => {
        if (!validateConversationId(id)) {
          throw new Error('Invalid conversation ID')
        }

        return await generateConversationTitle(id)
      })
    }
  )

  // ============================================================================
  // Message Handlers
  // ============================================================================

  // Note: message:add removed - use message:send instead

  // Note: message:add-text removed - use message:send instead

  // Note: message:add-multipart removed - use message:send instead

  // Get message
  ipcMain.handle('message:get', async (_, id: unknown): Promise<IPCResult<Message | null>> => {
    return handleIPCCall(async () => {
      if (!validateMessageId(id)) {
        throw new Error('Invalid message ID')
      }

      return await getMessage(id)
    })
  })

  // List messages in conversation
  ipcMain.handle(
    'message:list',
    async (_, conversationId: unknown): Promise<IPCResult<Message[]>> => {
      return handleIPCCall(async () => {
        if (!validateConversationId(conversationId)) {
          throw new Error('Invalid conversation ID')
        }

        return await getMessages(conversationId)
      })
    }
  )

  // Update message
  ipcMain.handle('message:update', async (_, data: unknown): Promise<IPCResult<Message>> => {
    return handleIPCCall(async () => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid message update data')
      }

      const request = data as any
      if (!validateMessageId(request.id)) {
        throw new Error('Invalid message ID')
      }

      if (!validateMessageContent(request.content)) {
        throw new Error('Invalid message content')
      }

      return await updateMessage(request.id, {
        content: request.content
      })
    })
  })

  // Delete message
  ipcMain.handle('message:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (!validateMessageId(id)) {
        throw new Error('Invalid message ID')
      }

      await deleteMessage(id)
    })
  })

  // Stop message streaming
  ipcMain.handle('message:stop', async (_, messageId: unknown): Promise<IPCResult<boolean>> => {
    return handleIPCCall(async () => {
      if (!validateMessageId(messageId)) {
        throw new Error('Invalid message ID')
      }

      // Attempt to cancel the streaming operation
      const cancelled = cancellationManager.cancel(messageId)

      if (cancelled) {
        console.log(`Cancelled streaming for message: ${messageId}`)

        // Send cancellation event to renderer
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, {
          messageId: messageId
        })
      }

      return cancelled
    })
  })

  // Send message (user input + AI response with streaming)
  ipcMain.handle('message:send', async (_, data: unknown): Promise<IPCResult<Message[]>> => {
    return handleIPCCall(async () => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid send message data')
      }

      const request = data as any

      if (!validateMessageContent(request.content)) {
        throw new Error('Invalid message content')
      }

      const providedConversationId: string | undefined =
        typeof request.conversationId === 'string' && request.conversationId.trim().length > 0
          ? request.conversationId.trim()
          : undefined

      const parentMessageId: string | undefined =
        typeof request.parentMessageId === 'string' && request.parentMessageId.trim().length > 0
          ? request.parentMessageId.trim()
          : undefined

      // Determine conversation - create if needed
      let actualConversationId = providedConversationId
      if (!actualConversationId) {
        const newConv = await createConversation({
          title: 'New Chat'
        })
        actualConversationId = newConv.id

        // Notify renderer about new conversation
        sendConversationEvent(CONVERSATION_EVENTS.CREATED, newConv)
      }

      // Create user message
      const userMessage = await addMessage({
        conversationId: actualConversationId,
        role: 'user',
        content: request.content as any,
        ...(parentMessageId && { parentMessageId })
      })
      sendMessageEvent(MESSAGE_EVENTS.ADDED, userMessage)

      // Small delay to ensure different timestamp ordering
      await new Promise((r) => setTimeout(r, 1))

      // Create assistant placeholder
      const assistantMessage = await addMessage({
        conversationId: actualConversationId,
        role: 'assistant',
        content: [{ type: 'text' as const, text: '\u200B' }],
        parentMessageId: userMessage.id
      })

      // Use assistant service for unified streaming logic
      const { generateReplyForNewMessage } = await import('../services/assistant-service')
      await generateReplyForNewMessage(assistantMessage.id, actualConversationId)

      // Return empty list (UI updates via events)
      return []
    })
  })

  // Regenerate message (AI response)
  ipcMain.handle(
    'message:regenerate',
    async (_, messageId: unknown): Promise<IPCResult<Message>> => {
      return handleIPCCall(async () => {
        if (!validateMessageId(messageId)) {
          throw new Error('Invalid message ID')
        }

        // Get the message to regenerate for validation
        const message = await getMessage(messageId)
        if (!message) {
          throw new Error('Message not found')
        }

        if (message.role !== 'assistant') {
          throw new Error('Can only regenerate assistant messages')
        }

        // Clear the current message content and reasoning, then set placeholder
        const clearedMessage = await updateMessage(messageId, {
          content: [{ type: 'text' as const, text: '\u200B' }], // Zero-width space placeholder
          reasoning: '' // Clear any existing reasoning
        })

        // Generate new response using the atomic module
        await regenerateReply(messageId)

        return clearedMessage
      })
    }
  )

  // Edit message
  ipcMain.handle(
    'message:edit',
    async (_, messageId: unknown, content: unknown): Promise<IPCResult<Message>> => {
      return handleIPCCall(async () => {
        if (!validateMessageId(messageId)) {
          throw new Error('Invalid message ID')
        }

        if (!validateMessageContent(content)) {
          throw new Error('Invalid message content')
        }

        const updatedMessage = await updateMessage(messageId, {
          content: content as MessageContent
        })

        sendMessageEvent(MESSAGE_EVENTS.UPDATED, updatedMessage)
        return updatedMessage
      })
    }
  )

  // Test AI configuration
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

/**
 * Unregisters all conversation and message-related IPC handlers
 * Called during application shutdown for cleanup
 */
export function unregisterConversationIPCHandlers(): void {
  console.log('Unregistering conversation and message IPC handlers...')

  const channels = [
    // Conversation channels
    'conversation:create',
    'conversation:list-paginated',
    'conversation:get',
    'conversation:update',
    'conversation:update-title',
    'conversation:delete',
    'conversation:update-settings',
    'conversation:generate-title',
    // Message channels
    'message:get',
    'message:list',
    'message:update',
    'message:delete',
    'message:stop',
    'message:send',
    'message:regenerate',
    'message:edit',

    // AI channels
    'ai:test-connection'
  ]

  channels.forEach((channel) => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('Conversation and message IPC handlers unregistered')
}

/**
 * Sends conversation-related events to renderer processes
 * Used for real-time updates and notifications
 */
export function sendConversationEvent(eventType: string, data: unknown): void {
  // Get all windows and send the event
  const windows = BrowserWindow.getAllWindows()

  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(`conversation:${eventType}`, data)
    }
  })
}

/**
 * Sends message-related events to renderer processes
 * Used for real-time updates and streaming responses
 */
export function sendMessageEvent(eventType: string, data: unknown): void {
  // Get all windows and send the event
  const windows = BrowserWindow.getAllWindows()

  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(`message:${eventType}`, data)
    }
  })
}

/**
 * Conversation event types for real-time notifications
 */
export const CONVERSATION_EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  MOVED: 'moved',
  TITLE_GENERATED: 'title_generated'
} as const

/**
 * Message event types for real-time notifications
 */
export const MESSAGE_EVENTS = {
  ADDED: 'added',
  UPDATED: 'updated',
  DELETED: 'deleted',
  STREAMING_START: 'streaming_start',
  STREAMING_CHUNK: 'streaming_chunk',
  STREAMING_END: 'streaming_end',
  STREAMING_ERROR: 'streaming_error',
  STREAMING_CANCELLED: 'streaming_cancelled',
  TEXT_START: 'text_start',
  TEXT_END: 'text_end',
  REASONING_START: 'reasoning_start',
  REASONING_CHUNK: 'reasoning_chunk',
  REASONING_END: 'reasoning_end'
} as const

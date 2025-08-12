import { ipcMain, BrowserWindow } from 'electron'
import {
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  moveConversation,
  updateConversationSettings,
  generateConversationTitle
} from '../services/conversation'
import {
  addMessage,
  getMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  addTextMessage,
  addMultiPartMessage
} from '../services/message'
import type {
  IPCResult,
  ConversationCreateRequest,
  MessageAddRequest
} from '../../shared/types/ipc'
import type { Conversation, Message, SessionSettings, MessageContent } from '../../shared/types'

/**
 * Conversation and Message IPC Handler
 * Handles secure communication between renderer and main processes for conversation and message operations
 * Provides error handling and validation for all conversation and message-related IPC calls
 */

/**
 * Wraps service calls with consistent error handling and response format
 * Ensures all IPC responses follow the IPCResult pattern
 */
async function handleIPCCall<T>(operation: () => Promise<T>): Promise<IPCResult<T>> {
  try {
    const data = await operation()
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('IPC operation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Validates conversation creation request data
 */
function validateConversationCreateRequest(data: unknown): data is ConversationCreateRequest {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as ConversationCreateRequest
  return (
    (request.projectId === undefined || typeof request.projectId === 'string') &&
    (request.title === undefined || typeof request.title === 'string')
  )
}

/**
 * Validates message add request data
 */
function validateMessageAddRequest(data: unknown): data is MessageAddRequest {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as MessageAddRequest
  return (
    typeof request.conversationId === 'string' &&
    request.conversationId.trim().length > 0 &&
    ['user', 'assistant'].includes(request.role) &&
    Array.isArray(request.content) &&
    request.content.length > 0
  )
}

/**
 * Validates conversation ID parameter
 */
function validateConversationId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

/**
 * Validates message ID parameter
 */
function validateMessageId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

/**
 * Validates conversation update data
 */
function validateConversationUpdateData(data: unknown): data is {
  id: string
  title?: string
  projectId?: string
  settings?: SessionSettings
} {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as any
  return (
    typeof request.id === 'string' &&
    request.id.trim().length > 0 &&
    (request.title === undefined || typeof request.title === 'string') &&
    (request.projectId === undefined ||
      request.projectId === null ||
      typeof request.projectId === 'string') &&
    (request.settings === undefined ||
      (typeof request.settings === 'object' && request.settings !== null))
  )
}

/**
 * Validates message content for updates
 */
function validateMessageContent(content: unknown): content is MessageContent {
  return Array.isArray(content) && content.length > 0
}

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
        if (!validateConversationCreateRequest(data)) {
          throw new Error('Invalid conversation creation data')
        }

        return await createConversation({
          projectId: data.projectId,
          title: data.title
        })
      })
    }
  )

  // List conversations
  ipcMain.handle(
    'conversation:list',
    async (_, projectId?: unknown): Promise<IPCResult<Conversation[]>> => {
      return handleIPCCall(async () => {
        const validProjectId = projectId && typeof projectId === 'string' ? projectId : undefined
        return await listConversations(validProjectId)
      })
    }
  )

  // Get single conversation
  ipcMain.handle(
    'conversation:get',
    async (_, id: unknown): Promise<IPCResult<Conversation | null>> => {
      return handleIPCCall(async () => {
        if (!validateConversationId(id)) {
          throw new Error('Invalid conversation ID')
        }

        return await getConversation(id)
      })
    }
  )

  // Update conversation
  ipcMain.handle(
    'conversation:update',
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        if (!validateConversationUpdateData(data)) {
          throw new Error('Invalid conversation update data')
        }

        return await updateConversation(data.id, {
          title: data.title,
          projectId: data.projectId,
          settings: data.settings
        })
      })
    }
  )

  // Delete conversation
  ipcMain.handle('conversation:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (!validateConversationId(id)) {
        throw new Error('Invalid conversation ID')
      }

      await deleteConversation(id)
    })
  })

  // Move conversation between projects
  ipcMain.handle(
    'conversation:move',
    async (_, data: unknown): Promise<IPCResult<Conversation>> => {
      return handleIPCCall(async () => {
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid move conversation data')
        }

        const request = data as any
        if (!validateConversationId(request.conversationId)) {
          throw new Error('Invalid conversation ID')
        }

        const targetProjectId =
          request.projectId === null
            ? null
            : typeof request.projectId === 'string'
              ? request.projectId
              : null

        return await moveConversation(request.conversationId, targetProjectId)
      })
    }
  )

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

        return await updateConversationSettings(request.conversationId, request.settings)
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

  // Add message
  ipcMain.handle('message:add', async (_, data: unknown): Promise<IPCResult<Message>> => {
    return handleIPCCall(async () => {
      if (!validateMessageAddRequest(data)) {
        throw new Error('Invalid message add data')
      }

      return await addMessage({
        conversationId: data.conversationId,
        role: data.role,
        content: data.content
      })
    })
  })

  // Add text message (convenience method)
  ipcMain.handle('message:add-text', async (_, data: unknown): Promise<IPCResult<Message>> => {
    return handleIPCCall(async () => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid text message data')
      }

      const request = data as any
      if (!validateConversationId(request.conversationId)) {
        throw new Error('Invalid conversation ID')
      }

      if (!request.role || !['user', 'assistant'].includes(request.role)) {
        throw new Error('Invalid message role')
      }

      if (!request.text || typeof request.text !== 'string') {
        throw new Error('Invalid text content')
      }

      return await addTextMessage(
        request.conversationId,
        request.role,
        request.text,
        request.parentMessageId
      )
    })
  })

  // Add multi-part message
  ipcMain.handle('message:add-multipart', async (_, data: unknown): Promise<IPCResult<Message>> => {
    return handleIPCCall(async () => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid multi-part message data')
      }

      const request = data as any
      if (!validateConversationId(request.conversationId)) {
        throw new Error('Invalid conversation ID')
      }

      if (!request.role || !['user', 'assistant'].includes(request.role)) {
        throw new Error('Invalid message role')
      }

      if (!Array.isArray(request.parts) || request.parts.length === 0) {
        throw new Error('Invalid content parts')
      }

      return await addMultiPartMessage(
        request.conversationId,
        request.role,
        request.parts,
        request.parentMessageId
      )
    })
  })

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
    'conversation:list',
    'conversation:get',
    'conversation:update',
    'conversation:delete',
    'conversation:move',
    'conversation:update-settings',
    'conversation:generate-title',

    // Message channels
    'message:add',
    'message:add-text',
    'message:add-multipart',
    'message:get',
    'message:list',
    'message:update',
    'message:delete'
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
  STREAMING_ERROR: 'streaming_error'
} as const

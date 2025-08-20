import { ipcMain, BrowserWindow } from 'electron'
import {
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  updateConversationSettings,
  generateConversationTitle,
  type CreateConversationData,
  type UpdateConversationData
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
import type { Conversation, SessionSettings } from '../../shared/types/conversation'
import type { Message, MessageContent } from '../../shared/types/message'
import { testAIConfiguration } from '../services/ai-chat-vercel'
import { regenerateAssistantMessage } from '../services/assistant-message-generator'
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
 * Validates message add request data
 */
function validateMessageAddRequest(data: unknown): data is MessageAddRequest {
  if (!validateObject(data)) return false
  const request = data as MessageAddRequest
  return (
    ValidationPatterns.conversationId(request.conversationId) &&
    ValidationPatterns.messageRole(request.role) &&
    ValidationPatterns.messageContent(request.content)
  )
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

  // List conversations
  ipcMain.handle('conversation:list', async (): Promise<IPCResult<Conversation[]>> => {
    return handleIPCCall(async () => {
      return await listConversations()
    })
  })

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

      // Prepare context messages for AI: use existing conversation if provided, else just current user message
      let contextMessages: Message[]
      if (providedConversationId) {
        contextMessages = await getMessages(providedConversationId)
        // Append a virtual user message for context
        contextMessages = [
          ...contextMessages,
          {
            id: 'virtual-user',
            conversationId: providedConversationId,
            role: 'user',
            content: request.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Message
        ]
      } else {
        contextMessages = [
          {
            id: 'virtual-user',
            conversationId: 'virtual',
            role: 'user',
            content: request.content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as Message
        ]
      }

      // Accumulators for partial writes
      let accumulatedText = ''
      let accumulatedReasoning = ''

      // We'll assign these on stream start
      let actualConversationId: string | undefined = providedConversationId
      let assistantMessageId: string | undefined

      // Create a cancellation token (to be registered later when we have assistantMessageId)
      const token = cancellationManager.createToken(`temp-${Date.now()}`)

      // Start streaming using AI service, relying only on fullStream
      const { generateAIResponseWithStreaming } = await import('../services/ai-chat-vercel')

      const response = await generateAIResponseWithStreaming(
        contextMessages,
        {
          onStreamStart: async () => {
            try {
              // Ensure conversation exists (create only when not provided)
              if (!actualConversationId) {
                const newConv = await createConversation({
                  title: 'New Chat'
                })
                actualConversationId = newConv.id

                // Notify renderer about new conversation
                sendConversationEvent(CONVERSATION_EVENTS.CREATED, newConv)
              }

              // Prepare user content for DB: map unsupported parts (image) to text marker
              const userContentForDB = (request.content as any[]).map((part) => {
                if (part.type === 'image') {
                  const alt = part.image?.alt || 'image'
                  return { type: 'text', text: `[Image: ${alt}]` }
                }
                return part
              })

              // Write user message
              const userMessage = await addMessage({
                conversationId: actualConversationId!,
                role: 'user',
                content: userContentForDB
              })
              sendMessageEvent(MESSAGE_EVENTS.ADDED, userMessage)

              // Small delay to ensure different timestamp ordering
              await new Promise((r) => setTimeout(r, 1))

              // Create assistant placeholder
              const assistantMessage = await addMessage({
                conversationId: actualConversationId!,
                role: 'assistant',
                content: [{ type: 'text' as const, text: '\u200B' }]
              })
              assistantMessageId = assistantMessage.id

              // Register token with real message id for cancellation
              cancellationManager.registerToken(assistantMessageId, token)

              // Emit streaming start
              sendMessageEvent(MESSAGE_EVENTS.STREAMING_START, {
                messageId: assistantMessageId,
                message: assistantMessage
              })
            } catch (err) {
              console.error('Failed during onStreamStart:', err)
              throw err
            }
          },
          onTextChunk: (chunk: string) => {
            accumulatedText += chunk
            if (assistantMessageId) {
              sendMessageEvent(MESSAGE_EVENTS.STREAMING_CHUNK, {
                messageId: assistantMessageId,
                chunk
              })
            }
          },
          onReasoningStart: () => {
            if (assistantMessageId) {
              sendMessageEvent(MESSAGE_EVENTS.REASONING_START, { messageId: assistantMessageId })
            }
          },
          onReasoningChunk: (chunk: string) => {
            accumulatedReasoning += chunk
            if (assistantMessageId) {
              sendMessageEvent(MESSAGE_EVENTS.REASONING_CHUNK, {
                messageId: assistantMessageId,
                chunk
              })
            }
          },
          onReasoningEnd: () => {
            if (assistantMessageId) {
              sendMessageEvent(MESSAGE_EVENTS.REASONING_END, { messageId: assistantMessageId })
            }
          },
          onStreamFinish: () => {
            // no-op; final write handled after await
          }
        },
        token
      )

      // Determine if cancelled
      const wasCancelled = token.isCancelled

      if (!assistantMessageId || !actualConversationId) {
        // This shouldn't happen if onStreamStart executed
        throw new Error('Streaming did not initialize properly')
      }

      if (wasCancelled) {
        // Persist partial content
        const partialUpdateData: any = {
          content: [{ type: 'text' as const, text: accumulatedText || '\u200B' }]
        }
        if (accumulatedReasoning) partialUpdateData.reasoning = accumulatedReasoning

        const { updateMessage } = await import('../services/message')
        const updated = await updateMessage(assistantMessageId, partialUpdateData)
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, {
          messageId: assistantMessageId,
          message: updated
        })
      } else {
        // Persist final content
        const finalUpdateData: any = {
          content: response.content
        }
        if (response.reasoning !== undefined) finalUpdateData.reasoning = response.reasoning

        const { updateMessage } = await import('../services/message')
        const updated = await updateMessage(assistantMessageId, finalUpdateData)
        sendMessageEvent(MESSAGE_EVENTS.STREAMING_END, {
          messageId: assistantMessageId,
          message: updated
        })
      }

      // Clean up token mapping
      cancellationManager.complete(assistantMessageId)

      // Check if automatic title generation should be triggered
      try {
        const { getMessages } = await import('../services/message')
        const totalMessages = await getMessages(actualConversationId)
        const { shouldTriggerAutoGeneration } = await import('../services/title-generation')

        if (shouldTriggerAutoGeneration(totalMessages)) {
          console.log(
            `Triggering automatic title generation for conversation ${actualConversationId} after first exchange`
          )

          // Use setImmediate to trigger title generation asynchronously
          setImmediate(async () => {
            try {
              const { generateTitleForConversation } = await import('../services/title-generation')
              const { updateConversation } = await import('../services/conversation')

              const title = await generateTitleForConversation(actualConversationId!)

              // Only update if we got a meaningful title (not "New Chat")
              if (title && title !== 'New Chat') {
                await updateConversation(actualConversationId!, { title })

                // Send title update event to renderer
                sendConversationEvent(CONVERSATION_EVENTS.TITLE_GENERATED, {
                  conversationId: actualConversationId,
                  title
                })

                console.log(
                  `Successfully auto-generated title for conversation ${actualConversationId}: "${title}"`
                )
              } else {
                console.log(
                  `Skipping title update for conversation ${actualConversationId}: got fallback title "${title}"`
                )
              }
            } catch (titleError) {
              console.error('Failed to automatically generate title:', titleError)
            }
          })
        } else {
          const userMessages = totalMessages.filter((m) => m.role === 'user')
          const assistantMessages = totalMessages.filter((m) => m.role === 'assistant')
          console.log(
            `Not triggering title generation: ${userMessages.length} user messages, ${assistantMessages.length} assistant messages`
          )
        }
      } catch (titleError) {
        console.error('Failed to check title generation conditions:', titleError)
      }

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

        // Clear the current message content and set placeholder
        const clearedMessage = await updateMessage(messageId, {
          content: [{ type: 'text' as const, text: '\u200B' }] // Zero-width space placeholder
        })

        // Generate new response using the atomic module
        await regenerateAssistantMessage(messageId)

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
    'ai:test-configuration',
    async (): Promise<IPCResult<{ success: boolean; error?: string; model?: string }>> => {
      return handleIPCCall(async () => {
        return await testAIConfiguration()
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
    'conversation:list',
    'conversation:get',
    'conversation:update',
    'conversation:update-title',
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
    'message:delete',
    'message:stop',
    'message:send',
    'message:regenerate',
    'message:edit',

    // AI channels
    'ai:test-configuration'
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

  console.log(
    `[IPC] Sending message event: message:${eventType} to ${windows.length} windows`,
    data
  )

  windows.forEach((window, index) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      console.log(`[IPC] Sending to window ${index}: message:${eventType}`)
      window.webContents.send(`message:${eventType}`, data)
    } else {
      console.log(`[IPC] Skipping destroyed window ${index}`)
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
  REASONING_START: 'reasoning_start',
  REASONING_CHUNK: 'reasoning_chunk',
  REASONING_END: 'reasoning_end'
} as const

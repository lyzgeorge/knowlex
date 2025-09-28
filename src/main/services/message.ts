import {
  createMessage as dbCreateMessage,
  getMessage as dbGetMessage,
  listMessages as dbListMessages,
  updateMessage as dbUpdateMessage,
  deleteMessage as dbDeleteMessage
} from '@main/infra/database/queries'
import { generateId } from '@shared/utils/id'
import { formatOperationError } from '@shared/utils/error-handling'
import type { Message, MessageContent, MessageContentPart } from '@shared/types/message'
import type { AttachmentResult } from '@shared/types/file'
import { MessageContentSchema } from '@shared/schemas/message'

/**
 * Message Management Service
 * Handles business logic for message CRUD operations with multi-part content support
 * Provides validation, error handling, and content processing capabilities
 */

export interface CreateMessageData {
  conversationId: string
  role: 'user' | 'assistant'
  content: MessageContent
  parentMessageId?: string
}

export interface UpdateMessageData {
  content: MessageContent
  reasoning?: string
}

function assertValidMessageContent(content: MessageContent): MessageContent {
  const parsed = MessageContentSchema.safeParse(content)
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => {
        const path = issue.path.length ? ` (${issue.path.join('.')})` : ''
        return `${issue.message}${path}`
      })
      .join('; ')
    throw new Error(`Invalid message content: ${message}`)
  }
  return parsed.data as MessageContent
}

/**
 * Creates a new message with generated ID and validated content
 * Ensures conversation exists and content is properly formatted
 */
export async function addMessage(data: CreateMessageData): Promise<Message> {
  // Input validation
  if (!data.conversationId || data.conversationId.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  if (!data.role || !['user', 'assistant'].includes(data.role)) {
    throw new Error('Valid role (user or assistant) is required')
  }

  if (!data.content) {
    throw new Error('Message content is required')
  }

  const validatedContent = assertValidMessageContent(data.content)

  const messageId = generateId()
  const now = new Date().toISOString()

  const newMessage: Message = {
    id: messageId,
    conversationId: data.conversationId.trim(),
    role: data.role,
    content: validatedContent,
    createdAt: now,
    updatedAt: now
  }

  if (data.parentMessageId?.trim()) {
    newMessage.parentMessageId = data.parentMessageId.trim()
  }

  try {
    await dbCreateMessage(newMessage)
    console.log(
      `Message added successfully: ${messageId} (${data.role}) in conversation ${data.conversationId}`
    )
    return newMessage
  } catch (error) {
    console.error('Failed to add message:', error)
    throw new Error(formatOperationError('add message', error))
  }
}

/**
 * Retrieves a message by ID
 * Returns null if message is not found
 */
export async function getMessage(id: string): Promise<Message | null> {
  if (!id || id.trim().length === 0) {
    throw new Error('Message ID is required')
  }

  try {
    const message = await dbGetMessage(id.trim())
    return message
  } catch (error) {
    console.error(`Failed to get message ${id}:`, error)
    throw new Error(formatOperationError('retrieve message', error))
  }
}

/**
 * Lists all messages in a conversation ordered by creation time
 * Returns messages in chronological order for conversation display
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId || conversationId.trim().length === 0) {
    throw new Error('Conversation ID is required')
  }

  try {
    const messages = await dbListMessages(conversationId.trim())
    return messages
  } catch (error) {
    console.error(`Failed to get messages for conversation ${conversationId}:`, error)
    throw new Error(formatOperationError('retrieve messages', error))
  }
}

/**
 * Updates an existing message's content
 * Validates new content and ensures message exists
 */
export async function updateMessage(id: string, data: UpdateMessageData): Promise<Message> {
  if (!id || id.trim().length === 0) {
    throw new Error('Message ID is required')
  }

  if (!data.content) {
    throw new Error('Message content is required')
  }

  const validatedContent = assertValidMessageContent(data.content)

  // Check if message exists
  const existingMessage = await dbGetMessage(id.trim())
  if (!existingMessage) {
    throw new Error('Message not found')
  }

  try {
    await dbUpdateMessage(id, validatedContent, data.reasoning)

    // Fetch and return updated message
    const updatedMessage = await dbGetMessage(id)
    if (!updatedMessage) {
      throw new Error('Failed to retrieve updated message')
    }

    console.log(`Message updated successfully: ${id}`)
    return updatedMessage
  } catch (error) {
    console.error(`Failed to update message ${id}:`, error)
    throw new Error(formatOperationError('update message', error))
  }
}

/**
 * Deletes a message
 * Includes confirmation of deletion by checking if message exists first
 */
export async function deleteMessage(id: string): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new Error('Message ID is required')
  }

  // Check if message exists
  const existingMessage = await dbGetMessage(id.trim())
  if (!existingMessage) {
    throw new Error('Message not found')
  }

  try {
    await dbDeleteMessage(id)
    console.log(`Message deleted successfully: ${id}`)
  } catch (error) {
    console.error(`Failed to delete message ${id}:`, error)
    throw new Error(formatOperationError('delete message', error))
  }
}

/**
 * Gets the text content from a message by combining all text parts
 * Utility method for processing and analyzing message content
 */
export function extractTextContent(message: Message): string {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text || '')
    .join('\n')
    .trim()
}

/**
 * Converts processed attachment results to proper message content parts
 * This handles the conversion from processed attachments to message content
 */
export function convertAttachmentsToMessageParts(
  attachmentResults: AttachmentResult[]
): MessageContentPart[] {
  const parts: MessageContentPart[] = []

  for (const fileResult of attachmentResults) {
    if (fileResult.error) {
      // Add error as text part
      parts.push({
        type: 'text',
        text: `[Error processing ${fileResult.filename}]: ${fileResult.error}`
      })
      continue
    }

    // All files kept as attachment content parts
    parts.push({
      type: 'attachment',
      attachment: {
        filename: fileResult.filename,
        content: fileResult.content,
        size: fileResult.size,
        mimeType: fileResult.mimeType
      }
    })
  }

  return parts
}

/**
 * Builds message content array from text and attachments
 * Ensures the message contains at least one meaningful content part
 */
export function buildMessageContent(
  text: string,
  attachments?: AttachmentResult[]
): MessageContent {
  const content: MessageContent = []

  if (text && text.trim().length > 0) {
    content.push({ type: 'text', text: text.trim() })
  }

  if (attachments && attachments.length > 0) {
    content.push(...convertAttachmentsToMessageParts(attachments))
  }

  if (content.length === 0) {
    throw new Error('Message must contain at least one content part')
  }

  return assertValidMessageContent(content)
}

/**
 * Appends a message content part to an existing message
 * Useful for building messages incrementally
 */
export function appendMessageContent(message: Message, part: MessageContentPart): MessageContent {
  const updatedContent = [...message.content, part]
  return assertValidMessageContent(updatedContent)
}

import {
  createMessage as dbCreateMessage,
  getMessage as dbGetMessage,
  listMessages as dbListMessages,
  updateMessage as dbUpdateMessage,
  deleteMessage as dbDeleteMessage
} from '../database/queries'
import { generateId } from '../../shared/utils/id'
import type { Message, MessageContent, MessageContentPart, ContentType } from '../../shared/types'

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
}

/**
 * Validates message content parts according to business rules
 */
function validateMessageContent(content: MessageContent): void {
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Message content must be a non-empty array of content parts')
  }

  // Check if there's at least one meaningful content part (not just empty text)
  const hasMeaningfulContent = content.some((part) => {
    if (part.type === 'text') {
      return part.text && part.text.trim().length > 0
    }
    return true // Non-text parts are always considered meaningful
  })

  if (!hasMeaningfulContent) {
    throw new Error('Message must contain at least one meaningful content part')
  }

  // Validate each content part
  content.forEach((part, index) => {
    if (!part || typeof part !== 'object') {
      throw new Error(`Invalid content part at index ${index}`)
    }

    if (!part.type || !isValidContentType(part.type)) {
      throw new Error(`Invalid content type "${part.type}" at index ${index}`)
    }

    switch (part.type) {
      case 'text':
        if (!part.text || typeof part.text !== 'string') {
          throw new Error(`Text content part at index ${index} must have valid text`)
        }
        // Allow empty text content if there are other content parts (like files)
        if (part.text.trim().length === 0 && content.length === 1) {
          throw new Error(
            `Text content part at index ${index} cannot be empty when it's the only content`
          )
        }
        break

      case 'image':
        if (!part.image || typeof part.image !== 'object') {
          throw new Error(`Image content part at index ${index} must have valid image data`)
        }
        if (!part.image.url || typeof part.image.url !== 'string') {
          throw new Error(`Image content part at index ${index} must have valid URL`)
        }
        if (!part.image.mimeType || typeof part.image.mimeType !== 'string') {
          throw new Error(`Image content part at index ${index} must have valid mime type`)
        }
        break

      case 'citation':
        if (!part.citation || typeof part.citation !== 'object') {
          throw new Error(`Citation content part at index ${index} must have valid citation data`)
        }
        if (!part.citation.filename || typeof part.citation.filename !== 'string') {
          throw new Error(`Citation content part at index ${index} must have valid filename`)
        }
        if (!part.citation.content || typeof part.citation.content !== 'string') {
          throw new Error(`Citation content part at index ${index} must have valid content`)
        }
        break

      case 'tool-call':
        if (!part.toolCall || typeof part.toolCall !== 'object') {
          throw new Error(`Tool call content part at index ${index} must have valid tool call data`)
        }
        if (!part.toolCall.id || typeof part.toolCall.id !== 'string') {
          throw new Error(`Tool call content part at index ${index} must have valid ID`)
        }
        if (!part.toolCall.name || typeof part.toolCall.name !== 'string') {
          throw new Error(`Tool call content part at index ${index} must have valid name`)
        }
        break

      case 'temporary-file':
        if (!part.temporaryFile || typeof part.temporaryFile !== 'object') {
          throw new Error(`Temporary file content part at index ${index} must have valid file data`)
        }
        if (!part.temporaryFile.filename || typeof part.temporaryFile.filename !== 'string') {
          throw new Error(`Temporary file content part at index ${index} must have valid filename`)
        }
        if (!part.temporaryFile.content || typeof part.temporaryFile.content !== 'string') {
          throw new Error(`Temporary file content part at index ${index} must have valid content`)
        }
        if (typeof part.temporaryFile.size !== 'number' || part.temporaryFile.size < 0) {
          throw new Error(`Temporary file content part at index ${index} must have valid size`)
        }
        if (!part.temporaryFile.mimeType || typeof part.temporaryFile.mimeType !== 'string') {
          throw new Error(`Temporary file content part at index ${index} must have valid mime type`)
        }
        break

      default:
        throw new Error(`Unsupported content type "${part.type}" at index ${index}`)
    }
  })
}

/**
 * Checks if a content type is valid
 */
function isValidContentType(type: string): type is ContentType {
  return ['text', 'image', 'citation', 'tool-call', 'temporary-file'].includes(type)
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

  // Validate content structure
  validateMessageContent(data.content)

  // TODO: Verify conversation exists
  // const conversation = await getConversation(data.conversationId)
  // if (!conversation) {
  //   throw new Error('Conversation not found')
  // }

  const messageId = generateId()
  const now = new Date().toISOString()

  const newMessage: Message = {
    id: messageId,
    conversationId: data.conversationId.trim(),
    role: data.role,
    content: data.content,
    parentMessageId: data.parentMessageId?.trim() || undefined,
    createdAt: now,
    updatedAt: now
  }

  try {
    await dbCreateMessage(newMessage)
    console.log(
      `Message added successfully: ${messageId} (${data.role}) in conversation ${data.conversationId}`
    )
    return newMessage
  } catch (error) {
    console.error('Failed to add message:', error)
    throw new Error(
      `Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
    throw new Error(
      `Failed to retrieve message: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
    throw new Error(
      `Failed to retrieve messages: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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

  // Validate content structure
  validateMessageContent(data.content)

  // Check if message exists
  const existingMessage = await dbGetMessage(id.trim())
  if (!existingMessage) {
    throw new Error('Message not found')
  }

  try {
    await dbUpdateMessage(id, data.content)

    // Fetch and return updated message
    const updatedMessage = await dbGetMessage(id)
    if (!updatedMessage) {
      throw new Error('Failed to retrieve updated message')
    }

    console.log(`Message updated successfully: ${id}`)
    return updatedMessage
  } catch (error) {
    console.error(`Failed to update message ${id}:`, error)
    throw new Error(
      `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
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
    throw new Error(
      `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Creates a simple text message
 * Convenience method for creating text-only messages
 */
export async function addTextMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  text: string,
  parentMessageId?: string
): Promise<Message> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text content cannot be empty')
  }

  const content: MessageContent = [
    {
      type: 'text',
      text: text.trim()
    }
  ]

  return await addMessage({
    conversationId,
    role,
    content,
    parentMessageId
  })
}

/**
 * Creates a message with multiple content parts
 * Convenience method for creating complex multi-part messages
 */
export async function addMultiPartMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  parts: MessageContentPart[],
  parentMessageId?: string
): Promise<Message> {
  if (!parts || parts.length === 0) {
    throw new Error('At least one content part is required')
  }

  return await addMessage({
    conversationId,
    role,
    content: parts,
    parentMessageId
  })
}

/**
 * Adds a citation to an existing message
 * Utility method for RAG functionality to add citations to AI responses
 */
export async function addCitationToMessage(
  messageId: string,
  filename: string,
  fileId: string,
  content: string,
  similarity: number,
  pageNumber?: number
): Promise<Message> {
  const existingMessage = await getMessage(messageId)
  if (!existingMessage) {
    throw new Error('Message not found')
  }

  // Add citation part to existing content
  const citationPart: MessageContentPart = {
    type: 'citation',
    citation: {
      filename,
      fileId,
      content,
      similarity,
      pageNumber
    }
  }

  const updatedContent = [...existingMessage.content, citationPart]

  return await updateMessage(messageId, { content: updatedContent })
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
 * Gets all citations from a message
 * Utility method for displaying and processing citations
 */
export function extractCitations(message: Message) {
  return message.content
    .filter((part) => part.type === 'citation')
    .map((part) => part.citation)
    .filter(Boolean)
}

/**
 * Counts different types of content in a message
 * Utility method for analytics and message processing
 */
export function getContentStats(message: Message) {
  const stats = {
    total: message.content.length,
    text: 0,
    image: 0,
    citation: 0,
    toolCall: 0,
    temporaryFile: 0
  }

  message.content.forEach((part) => {
    switch (part.type) {
      case 'text':
        stats.text++
        break
      case 'image':
        stats.image++
        break
      case 'citation':
        stats.citation++
        break
      case 'tool-call':
        stats.toolCall++
        break
      case 'temporary-file':
        stats.temporaryFile++
        break
    }
  })

  return stats
}

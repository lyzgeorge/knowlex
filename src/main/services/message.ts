import {
  createMessage as dbCreateMessage,
  getMessage as dbGetMessage,
  listMessages as dbListMessages,
  updateMessage as dbUpdateMessage,
  deleteMessage as dbDeleteMessage
} from '../database/queries'
import { generateId } from '../../shared/utils/id'
import type {
  Message,
  MessageContent,
  MessageContentPart,
  ContentType
} from '../../shared/types/message'
import type { TemporaryFileResult } from '../../shared/types/file'

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

/**
 * Validates message content parts according to business rules
 */
function validateMessageContent(content: MessageContent): void {
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error('Message content must be a non-empty array of content parts')
  }

  let hasMeaningfulContent = false

  content.forEach((part, index) => {
    if (!part || typeof part !== 'object') {
      throw new Error(`Invalid content part at index ${index}`)
    }

    if (!part.type || !isValidContentType(part.type)) {
      throw new Error(`Invalid content type "${part.type}" at index ${index}`)
    }

    // Image parts are supported; validated in validateContentPart

    // Validate and check if part has meaningful content
    const isValid = validateContentPart(part, index)
    if (isValid) {
      hasMeaningfulContent = true
    }
  })

  if (!hasMeaningfulContent) {
    throw new Error('Message must contain at least one meaningful content part')
  }
}

/**
 * Validates a single content part and returns if it has meaningful content
 */
function validateContentPart(part: MessageContentPart, index: number): boolean {
  switch (part.type) {
    case 'text':
      if (!part.text || typeof part.text !== 'string') {
        throw new Error(`Text content part at index ${index} must have valid text`)
      }
      return part.text.trim().length > 0

    case 'citation':
      if (!part.citation?.filename || !part.citation?.content) {
        throw new Error(`Citation content part at index ${index} must have valid citation data`)
      }
      return true

    case 'tool-call':
      if (!part.toolCall?.id || !part.toolCall?.name) {
        throw new Error(`Tool call content part at index ${index} must have valid tool call data`)
      }
      return true

    case 'temporary-file': {
      const file = part.temporaryFile
      if (
        !file?.filename ||
        !file?.content ||
        !file?.mimeType ||
        typeof file.size !== 'number' ||
        file.size < 0
      ) {
        throw new Error(`Temporary file content part at index ${index} must have valid file data`)
      }
      return true
    }

    case 'image': {
      const img = part.image
      if (!img || typeof img.image !== 'string' || img.image.trim().length === 0) {
        throw new Error(`Image content part at index ${index} must have base64 data`)
      }
      // mediaType is optional; when provided, it should be a string
      if (img.mediaType !== undefined && typeof img.mediaType !== 'string') {
        throw new Error(`Image content part at index ${index} has invalid mediaType`)
      }
      return true
    }

    default:
      return false
  }
}

/**
 * Checks if a content type is valid
 */
function isValidContentType(type: string): type is ContentType {
  return ['text', 'citation', 'tool-call', 'temporary-file', 'image'].includes(type)
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

  const messageId = generateId()
  const now = new Date().toISOString()

  const newMessage: Message = {
    id: messageId,
    conversationId: data.conversationId.trim(),
    role: data.role,
    content: data.content,
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
    await dbUpdateMessage(id, data.content, data.reasoning)

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

  const messageData: CreateMessageData = {
    conversationId,
    role,
    content
  }

  if (parentMessageId !== undefined) {
    messageData.parentMessageId = parentMessageId
  }

  return await addMessage(messageData)
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

  const messageData: CreateMessageData = {
    conversationId,
    role,
    content: parts
  }

  if (parentMessageId !== undefined) {
    messageData.parentMessageId = parentMessageId
  }

  return await addMessage(messageData)
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
  const citation: any = {
    filename,
    fileId,
    content,
    similarity
  }

  if (pageNumber !== undefined) {
    citation.pageNumber = pageNumber
  }

  const citationPart: MessageContentPart = {
    type: 'citation',
    citation
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
    citation: 0,
    toolCall: 0,
    temporaryFile: 0
  }

  message.content.forEach((part) => {
    switch (part.type) {
      case 'text':
        stats.text++
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

/**
 * Converts temporary file results to proper message content parts
 * This handles the conversion from processed temporary files to message content
 */
export function convertTemporaryFilesToMessageParts(
  temporaryFileResults: TemporaryFileResult[]
): MessageContentPart[] {
  const parts: MessageContentPart[] = []

  for (const fileResult of temporaryFileResults) {
    if (fileResult.error) {
      // Add error as text part
      parts.push({
        type: 'text',
        text: `[Error processing ${fileResult.filename}]: ${fileResult.error}`
      })
      continue
    }

    // All files kept as temporary file content parts
    parts.push({
      type: 'temporary-file',
      temporaryFile: {
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
 * Creates a message with temporary files properly converted to content parts
 * Convenience method that handles temporary file conversion automatically
 */
export async function addMessageWithTemporaryFiles(
  conversationId: string,
  role: 'user' | 'assistant',
  textContent: string,
  temporaryFileResults: TemporaryFileResult[] = [],
  parentMessageId?: string
): Promise<Message> {
  const content: MessageContent = []

  // Add text content if provided
  if (textContent && textContent.trim().length > 0) {
    content.push({
      type: 'text',
      text: textContent.trim()
    })
  }

  // Convert and add temporary files
  const fileParts = convertTemporaryFilesToMessageParts(temporaryFileResults)
  content.push(...fileParts)

  // Ensure we have at least some content
  if (content.length === 0) {
    throw new Error('Message must have at least some content')
  }

  const messageData: CreateMessageData = {
    conversationId,
    role,
    content
  }

  if (parentMessageId !== undefined) {
    messageData.parentMessageId = parentMessageId
  }

  return await addMessage(messageData)
}

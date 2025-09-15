/**
 * Shared message utilities
 *
 * Centralizes common message processing logic to reduce duplication
 * between ConversationPage, ChatInputBox, UserMessage, and AssistantMessage.
 */

import type { Message, MessageContent, MessageContentPart } from '@shared/types/message'
import { fromUserInput as buildFromUserInput } from '@shared/message/content-builder'

/**
 * Gets the last assistant message from a list of messages
 */
export const getLastAssistantMessage = (messages: Message[]): Message | undefined => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.role === 'assistant') {
      return message
    }
  }
  return undefined
}

/**
 * File-like object for building message content
 */
export interface MessageFileInput {
  filename: string
  content: string
  size: number
  mimeType: string
  isImage: boolean
}

/**
 * Builds user message content from text and files
 */
export const buildUserMessageContent = (
  text: string,
  files: MessageFileInput[] = []
): MessageContent => {
  const validFiles = files.filter((f) => f.filename && f.content)
  return buildFromUserInput({ text: text.trim(), files: validFiles })
}

/**
 * Extracts text content from message content parts
 */
export const extractTextParts = (content: MessageContent): string => {
  return content
    .filter((part: MessageContentPart) => part.type === 'text')
    .map((part: MessageContentPart) => part.text || '')
    .join('\n')
}

/**
 * Translation map for copy messages
 */
export interface CopyMessageTranslations {
  copied: string
  copiedDescription: string
  copyFailed: string
  copyFailedDescription: string
}

/**
 * Default English translations for copy messages
 */
const defaultTranslations: CopyMessageTranslations = {
  copied: 'Copied',
  copiedDescription: 'Text content copied to clipboard',
  copyFailed: 'Copy failed',
  copyFailedDescription: 'Failed to copy'
}

/**
 * Copies message text content to clipboard with notifications
 */
export const copyMessageText = async (
  message: Message,
  notifications: {
    success: (options: { title: string; description: string; duration?: number }) => void
    error: (options: { title: string; description: string; duration?: number }) => void
  },
  translations?: Partial<CopyMessageTranslations>
): Promise<void> => {
  const t = { ...defaultTranslations, ...translations }

  try {
    const content = extractTextParts(message.content)
    await navigator.clipboard.writeText(content)
    notifications.success({
      title: t.copied,
      description: t.copiedDescription,
      duration: 2000
    })
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    notifications.error({
      title: t.copyFailed,
      description: t.copyFailedDescription,
      duration: 3000
    })
  }
}

/**
 * Partitioned content parts for efficient access
 */
export interface PartitionedContent {
  textParts: MessageContentPart[]
  fileParts: MessageContentPart[]
  textContent: string
}

/**
 * Partitions content into text and file parts in a single scan
 */
export const partitionContent = (content: MessageContent): PartitionedContent => {
  const textParts: MessageContentPart[] = []
  const fileParts: MessageContentPart[] = []

  for (const part of content) {
    if (part.type === 'text') {
      textParts.push(part)
    } else if (part.type === 'attachment' || part.type === 'image') {
      fileParts.push(part)
    }
  }

  const textContent = textParts.map((part) => part.text || '').join('\n')

  return { textParts, fileParts, textContent }
}

/**
 * Gets file and image parts from message content
 */
export const getFileParts = (content: MessageContent): MessageContentPart[] => {
  return content.filter((part) => part.type === 'attachment' || part.type === 'image')
}

/**
 * Gets text parts from message content
 */
export const getTextParts = (content: MessageContent): MessageContentPart[] => {
  return content.filter((part) => part.type === 'text')
}

/**
 * Normalized message view models
 *
 * Provides consistent, computed message data structures to reduce
 * prop surface and eliminate redundant calculations in components.
 */

import type { Message, MessageContentPart } from '@shared/types/message'
import { extractTextParts, partitionContent } from './message-utils'
import { formatTime } from './time'
import { stripPlaceholder } from './text'

/**
 * Normalized user message view model
 */
export interface UserMessageViewModel {
  id: string
  textContent: string
  fileParts: MessageContentPart[]
  textParts: MessageContentPart[]
  hasFiles: boolean
  hasText: boolean
  formattedTimestamp: string
  reasoningEffort?: string | undefined
  updatedAt: string
}

/**
 * Normalized assistant message view model
 */
export interface AssistantMessageViewModel {
  id: string
  textContent: string
  visibleText: string
  hasReasoning: boolean
  reasoning?: string | undefined
  formattedTimestamp: string
  updatedAt: string
}

/**
 * Creates a user message view model from a message
 */
export const createUserMessageViewModel = (message: Message): UserMessageViewModel => {
  const { textParts, fileParts, textContent } = partitionContent(message.content)

  return {
    id: message.id,
    textContent,
    fileParts,
    textParts,
    hasFiles: fileParts.length > 0,
    hasText: textContent.trim().length > 0,
    formattedTimestamp: formatTime(message.updatedAt),
    reasoningEffort: message.reasoningEffort,
    updatedAt: message.updatedAt
  }
}

/**
 * Creates an assistant message view model from a message
 */
export const createAssistantMessageViewModel = (message: Message): AssistantMessageViewModel => {
  const textContent = extractTextParts(message.content)
  const visibleText = stripPlaceholder(textContent).trim()

  return {
    id: message.id,
    textContent,
    visibleText,
    hasReasoning: !!message.reasoning,
    reasoning: message.reasoning,
    formattedTimestamp: formatTime(message.updatedAt),
    updatedAt: message.updatedAt
  }
}

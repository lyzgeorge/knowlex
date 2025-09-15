/**
 * Unified token counting hook
 *
 * Provides consistent token counting across ChatInputBox and UserMessage edit mode
 * with support for different attachment/file formats.
 */

import { useMemo } from 'react'
import {
  useRequestTokenCount,
  TokenCountFile,
  UseRequestTokenCountResult
} from './useRequestTokenCount'
import type { ModelConfigPublic } from '@shared/types/models'

/**
 * Processed file from file upload hook
 */
export interface ProcessedFile {
  filename: string
  content?: string
  size: number
  mimeType: string
  isImage?: boolean
  error?: string | undefined
}

/**
 * Attachment from editable message hook
 */
export interface MessageAttachment {
  id: string
  filename: string
  content?: string
  size?: number
  mimeType: string
  partType: 'image' | 'attachment'
  kind: 'existing' | 'new'
}

/**
 * Input options for token counting
 */
export interface UseMessageTokenEstimateOptions {
  text: string
  attachments?: ProcessedFile[] | MessageAttachment[]
  model: ModelConfigPublic | null
}

/**
 * Converts ProcessedFiles to TokenCountFile format
 */
const convertProcessedFiles = (processedFiles: ProcessedFile[]): TokenCountFile[] => {
  return processedFiles
    .filter((file) => !file.error)
    .map((file, index) => ({
      id: `${file.filename}-${file.size}-${index}`,
      name: file.filename,
      type: file.isImage ? ('image' as const) : ('text' as const),
      content: file.content || '',
      ...(file.isImage && file.content && { dataUrl: file.content })
    }))
}

/**
 * Converts MessageAttachments to TokenCountFile format
 */
const convertMessageAttachments = (attachments: MessageAttachment[]): TokenCountFile[] => {
  return attachments
    .filter((att) => att.kind === 'new') // Only count new attachments
    .map((att) => ({
      id: att.id,
      name: att.filename,
      type: att.partType === 'image' ? ('image' as const) : ('text' as const),
      content: att.content || '',
      ...(att.partType === 'image' && att.content && { dataUrl: att.content })
    }))
}

/**
 * Determines if attachments are ProcessedFiles or MessageAttachments
 * MessageAttachment has 'partType' property, ProcessedFile has 'isImage' property
 */
const isProcessedFiles = (
  attachments: ProcessedFile[] | MessageAttachment[]
): attachments is ProcessedFile[] => {
  if (attachments.length === 0) return true
  // Check for partType which is unique to MessageAttachment
  return !('partType' in attachments[0]!)
}

/**
 * Unified hook for token counting with message content
 */
export const useMessageTokenEstimate = ({
  text,
  attachments = [],
  model
}: UseMessageTokenEstimateOptions): UseRequestTokenCountResult => {
  // Convert attachments to consistent format
  const tokenCountFiles = useMemo(() => {
    if (isProcessedFiles(attachments)) {
      return convertProcessedFiles(attachments)
    } else {
      return convertMessageAttachments(attachments)
    }
  }, [attachments])

  // Use the existing token counting hook
  return useRequestTokenCount({
    text,
    processedFiles: tokenCountFiles,
    model
  })
}

// Re-export types for convenience
export type { UseRequestTokenCountResult, TokenCountFile }

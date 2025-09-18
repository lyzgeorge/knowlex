import { useState, useCallback, useMemo } from 'react'
import type { Message, MessageContentPart, MessageContent } from '@shared/types/message'
import { normalizeParts } from '@shared/message/content-builder'
import { useAttachmentUpload, ProcessedAttachment } from '@renderer/hooks/useAttachmentUpload'

export interface UnifiedAttachment {
  id: string
  kind: 'existing' | 'new'
  partType: 'attachment' | 'image'
  filename: string
  mimeType: string
  size?: number
  content?: string
  originalPart?: MessageContentPart
}

export interface UseEditableMessageResult {
  draftText: string
  setDraftText: (text: string) => void
  attachments: UnifiedAttachment[]
  addFiles: (files: FileList) => void
  removeAttachment: (id: string) => void
  reset: () => void
  initialize: (message: Message) => void
  buildContent: () => MessageContent
  isDirty: () => boolean
  isValid: () => boolean
  isProcessing: boolean
}

/**
 * Hook for managing editable message state
 */
export function useEditableMessage(): UseEditableMessageResult {
  const [draftText, setDraftText] = useState('')
  const [existingAttachments, setExistingAttachments] = useState<MessageContentPart[]>([])
  const fileUpload = useAttachmentUpload()

  // Convert to unified attachment format
  const attachments = useMemo((): UnifiedAttachment[] => {
    const unified: UnifiedAttachment[] = []

    // Add existing attachments
    existingAttachments.forEach((part, index) => {
      if (part.type === 'attachment' && part.attachment) {
        unified.push({
          id: `existing-${index}-${part.attachment.filename}`,
          kind: 'existing',
          partType: 'attachment',
          filename: part.attachment.filename,
          mimeType: part.attachment.mimeType,
          size: part.attachment.size,
          content: part.attachment.content,
          originalPart: part
        })
      } else if (part.type === 'image' && part.image) {
        unified.push({
          id: `existing-${index}-${part.image.filename || 'image'}`,
          kind: 'existing',
          partType: 'image',
          filename: part.image.filename || 'image',
          mimeType: part.image.mediaType || 'image/jpeg',
          content: part.image.image,
          originalPart: part
        })
      }
    })

    // Add new attachments from file upload
    fileUpload.state.processedFiles.forEach((file: ProcessedAttachment) => {
      if (!file.error) {
        unified.push({
          id: `new-${file.filename}-${file.size}`,
          kind: 'new',
          partType: file.isImage ? 'image' : 'attachment',
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
          content: file.content
        })
      }
    })

    return unified
  }, [existingAttachments, fileUpload.state.processedFiles])

  const initialize = useCallback(
    (message: Message) => {
      // Extract text content (normalized)
      const textContent = message.content
        .filter((part: MessageContentPart) => part.type === 'text')
        .map((part: MessageContentPart) => part.text || '')
        .join('\n')

      // Only update if changed to avoid triggering parent effects repeatedly
      setDraftText((prev) => (prev !== textContent ? textContent : prev))

      // Extract existing attachments
      const attachmentParts = message.content.filter(
        (part: MessageContentPart) => part.type === 'attachment' || part.type === 'image'
      )
      setExistingAttachments((prev) => {
        // Shallow compare lengths & ids to skip unnecessary state updates
        if (prev.length === attachmentParts.length) {
          let same = true
          for (let i = 0; i < prev.length; i++) {
            if (prev[i] !== attachmentParts[i]) {
              same = false
              break
            }
          }
          if (same) return prev
        }
        return attachmentParts
      })

      // Clear file upload state for new attachments (only if there are residual processed files)
      if (fileUpload.state.processedFiles.length > 0 || fileUpload.state.files.length > 0) {
        fileUpload.clearFiles()
      }
    },
    [fileUpload]
  )

  const buildContent = useCallback((): MessageContent => {
    const parts: Partial<MessageContentPart>[] = []

    // Add text content if present
    const trimmedText = draftText.trim()
    if (trimmedText) {
      parts.push({ type: 'text', text: trimmedText })
    }

    // Add attachments - existing parts preserved, new parts constructed
    attachments.forEach((attachment) => {
      if (attachment.kind === 'existing' && attachment.originalPart) {
        parts.push(attachment.originalPart)
      } else if (attachment.kind === 'new') {
        if (attachment.partType === 'image') {
          parts.push({
            type: 'image',
            image: {
              image: attachment.content || '',
              mediaType: attachment.mimeType,
              filename: attachment.filename
            }
          })
        } else {
          parts.push({
            type: 'attachment',
            attachment: {
              filename: attachment.filename,
              content: attachment.content || '',
              size: attachment.size || 0,
              mimeType: attachment.mimeType
            }
          })
        }
      }
    })

    return normalizeParts(parts)
  }, [draftText, attachments])

  const addFiles = useCallback(
    (files: FileList) => {
      fileUpload.addFiles(files)
    },
    [fileUpload]
  )

  const removeAttachment = useCallback(
    (id: string) => {
      // Check if it's an existing attachment
      const existingIndex = existingAttachments.findIndex((_, index) => {
        return attachments.some(
          (att) => att.id === id && att.kind === 'existing' && att.id.includes(`existing-${index}-`)
        )
      })

      if (existingIndex >= 0) {
        setExistingAttachments((prev) => prev.filter((_, i) => i !== existingIndex))
        return
      }

      // Check if it's a new file from upload
      const newAttachment = attachments.find((att) => att.id === id && att.kind === 'new')
      if (newAttachment) {
        const fileToRemove = fileUpload.state.files.find(
          (f) => f.file.name === newAttachment.filename
        )
        if (fileToRemove) {
          fileUpload.removeFile(fileToRemove.file)
        }
      }
    },
    [attachments, existingAttachments, fileUpload]
  )

  const reset = useCallback(() => {
    setDraftText((prev) => (prev !== '' ? '' : prev))
    setExistingAttachments((prev) => (prev.length ? [] : prev))
    if (fileUpload.state.processedFiles.length > 0 || fileUpload.state.files.length > 0) {
      fileUpload.clearFiles()
    }
  }, [fileUpload])

  const isValid = useCallback((): boolean => {
    const content = buildContent()
    return content.some(
      (part) =>
        (part.type === 'text' && part.text?.trim()) ||
        (part.type === 'attachment' && part.attachment) ||
        (part.type === 'image' && part.image)
    )
  }, [buildContent])

  // For isDirty, we'll compare against a reference - this will be set up when using the hook
  const isDirty = useCallback(() => {
    // This will be enhanced when integrated with the component
    // For now, return true if there's any content
    return draftText.trim() !== '' || attachments.length > 0
  }, [draftText, attachments])

  return {
    draftText,
    setDraftText,
    attachments,
    addFiles,
    removeAttachment,
    reset,
    initialize,
    buildContent,
    isDirty,
    isValid,
    isProcessing: fileUpload.state.isProcessing
  }
}

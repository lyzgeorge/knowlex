import { useState, useCallback, useMemo } from 'react'
import type { Message, MessageContentPart, MessageContent } from '@shared/types/message'
import { normalizeParts } from '@shared/message/content-builder'
import { useFileUpload, ProcessedFile } from '@renderer/hooks/useFileUpload'

export interface UnifiedAttachment {
  id: string
  kind: 'existing' | 'new'
  partType: 'temporary-file' | 'image'
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
  const fileUpload = useFileUpload()

  // Convert to unified attachment format
  const attachments = useMemo((): UnifiedAttachment[] => {
    const unified: UnifiedAttachment[] = []

    // Add existing attachments
    existingAttachments.forEach((part, index) => {
      if (part.type === 'temporary-file' && part.temporaryFile) {
        unified.push({
          id: `existing-${index}-${part.temporaryFile.filename}`,
          kind: 'existing',
          partType: 'temporary-file',
          filename: part.temporaryFile.filename,
          mimeType: part.temporaryFile.mimeType,
          size: part.temporaryFile.size,
          content: part.temporaryFile.content,
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
    fileUpload.state.processedFiles.forEach((file: ProcessedFile) => {
      if (!file.error) {
        unified.push({
          id: `new-${file.filename}-${file.size}`,
          kind: 'new',
          partType: file.isImage ? 'image' : 'temporary-file',
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
      // Extract text content
      const textContent = message.content
        .filter((part: MessageContentPart) => part.type === 'text')
        .map((part: MessageContentPart) => part.text || '')
        .join('\n')
      setDraftText(textContent)

      // Extract existing attachments
      const attachmentParts = message.content.filter(
        (part: MessageContentPart) => part.type === 'temporary-file' || part.type === 'image'
      )
      setExistingAttachments(attachmentParts)

      // Clear file upload state for new attachments
      fileUpload.clearFiles()
    },
    [fileUpload.clearFiles]
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
            type: 'temporary-file',
            temporaryFile: {
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
    [fileUpload.addFiles]
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
    [attachments, existingAttachments, fileUpload.state.files, fileUpload.removeFile]
  )

  const reset = useCallback(() => {
    setDraftText('')
    setExistingAttachments([])
    fileUpload.clearFiles()
  }, [fileUpload.clearFiles])

  const isValid = useCallback((): boolean => {
    const content = buildContent()
    return content.some(
      (part) =>
        (part.type === 'text' && part.text?.trim()) ||
        (part.type === 'temporary-file' && part.temporaryFile) ||
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

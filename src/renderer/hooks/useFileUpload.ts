/**
 * Custom hook for handling temporary file uploads in chat interface
 * Focuses on simple, clear, atomic responsibilities:
 * - Validate files
 * - Add/remove files from local state
 * - Process files via main process and update state
 */

import { useState, useCallback, useRef } from 'react'
import { useNotifications } from '@renderer/components/ui'
import type { TemporaryFileResult } from '@shared/types/file'

export interface ProcessedFile extends TemporaryFileResult {
  isImage?: boolean
}

// Wrapper interface to add a unique ID to each File object for React keys
export interface FileUploadItem {
  id: string
  file: File
}

export interface FileUploadState {
  files: FileUploadItem[]
  processedFiles: ProcessedFile[]
  isProcessing: boolean
  error: string | null
  successfulFilesCount: number
}

export interface FileUploadHook {
  state: FileUploadState
  addFiles: (files: FileList | File[]) => void
  removeFile: (file: File) => void
  processFiles: () => Promise<ProcessedFile[]>
  clearFiles: () => void
  clearError: () => void
  // Drag and drop handlers
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

// File constraints matching backend
const MAX_FILES = 10
const MAX_FILE_SIZE = 1024 * 1024 // 1MB
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.xml',
  '.html',
  '.pdf',
  '.docx',
  '.pptx',
  '.xlsx',
  '.odt',
  '.odp',
  '.ods',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg'
]

// Export for use in file input accept attribute
export const getFileAcceptString = (): string => ALLOWED_TYPES.join(',')

// Export file constraints for use in components
export const getFileConstraints = () => ({
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_TOTAL_SIZE,
  ALLOWED_TYPES
})

// Helpers: atomic utilities
const buildFileKey = (f: File): string => `${f.name}-${f.size}-${f.lastModified}`
const getExtension = (name: string): string => `.${name.split('.').pop()?.toLowerCase()}`
const isBinaryExt = (ext: string): boolean =>
  [
    '.pdf',
    '.docx',
    '.pptx',
    '.xlsx',
    '.odt',
    '.odp',
    '.ods',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.svg'
  ].includes(ext)
const isImageMime = (mime?: string): boolean => Boolean(mime && mime.startsWith('image/'))

const validateSingleFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) return `File "${file.name}" is too large. Maximum size is 1MB.`
  const ext = getExtension(file.name)
  if (!ALLOWED_TYPES.includes(ext)) {
    return (
      'File "' + file.name + '" is not supported. Supported formats: ' + ALLOWED_TYPES.join(', ')
    )
  }
  return null
}

const uniqueBatch = (files: File[]): File[] => {
  const seen = new Set<string>()
  const res: File[] = []
  for (const f of files) {
    const k = buildFileKey(f)
    if (!seen.has(k)) {
      seen.add(k)
      res.push(f)
    }
  }
  return res
}

const readFileAsContent = async (
  file: File
): Promise<{ name: string; size: number; content: string }> => {
  const buffer = await file.arrayBuffer()
  const ext = getExtension(file.name)
  if (isBinaryExt(ext)) {
    const uint8Array = new Uint8Array(buffer)
    const CHUNK = 8192
    let binary = ''
    for (let i = 0; i < uint8Array.length; i += CHUNK) {
      const chunk = uint8Array.subarray(i, i + CHUNK)
      binary += String.fromCharCode(...Array.from(chunk))
    }
    return { name: file.name, size: file.size, content: btoa(binary) }
  }
  return { name: file.name, size: file.size, content: new TextDecoder().decode(buffer) }
}

export const useFileUpload = (): FileUploadHook => {
  const [state, setState] = useState<FileUploadState>({
    files: [],
    processedFiles: [],
    isProcessing: false,
    error: null,
    successfulFilesCount: 0
  })
  const notifications = useNotifications()
  const processingRef = useRef(false)

  // Process a batch of FileUploadItem immediately
  const processNewFiles = useCallback(
    async (items: FileUploadItem[]) => {
      if (!items.length || processingRef.current) return
      processingRef.current = true
      setState((s) => ({ ...s, isProcessing: true, error: null }))
      try {
        const payload = await Promise.all(items.map((it) => readFileAsContent(it.file)))
        const result = await window.knowlex.file.processTempContent({
          files: payload.map((p) => ({ name: p.name, content: p.content, size: p.size }))
        })
        if (!result.success) throw new Error(result.error || 'Failed to process files')
        const processed = (Array.isArray(result.data) ? result.data : []) as TemporaryFileResult[]
        const success = processed.filter((f) => !f.error)
        const failed = processed.filter((f) => f.error)

        // Notify
        if (success.length) notifications.filesProcessed(success.length)
        failed.forEach((f) => notifications.fileProcessingFailed(f.filename, f.error))

        // Update state: remove failed from files list; append successful to processedFiles
        setState((prev) => {
          const remainingFiles = failed.length
            ? prev.files.filter((fi) => !failed.some((ff) => ff.filename === fi.file.name))
            : prev.files
          const mapped: ProcessedFile[] = success.map((f) => ({
            ...f,
            isImage: isImageMime(f.mimeType)
          }))
          return {
            ...prev,
            files: remainingFiles,
            processedFiles: [...prev.processedFiles, ...mapped],
            successfulFilesCount: prev.successfulFilesCount + success.length,
            isProcessing: false
          }
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to process files'
        setState((s) => ({ ...s, error: msg, isProcessing: false }))
        notifications.fileError(msg)
      } finally {
        processingRef.current = false
      }
    },
    [notifications]
  )

  // Add files with validation and immediate processing
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const batch = uniqueBatch(Array.from(incoming))

      // Snapshot current state for validation
      const existing = state.files
      if (existing.length + batch.length > MAX_FILES) {
        notifications.fileTooMany(MAX_FILES)
        return
      }

      const existingTotal = existing.reduce((sum, it) => sum + it.file.size, 0)
      let total = existingTotal
      const validItems: FileUploadItem[] = []
      const errors: string[] = []

      for (const file of batch) {
        // duplicate against existing list
        const dup = existing.some((it) => buildFileKey(it.file) === buildFileKey(file))
        if (dup) {
          errors.push(`File "${file.name}" is already added.`)
          continue
        }
        const err = validateSingleFile(file)
        if (err) {
          errors.push(err)
          continue
        }
        if (total + file.size > MAX_TOTAL_SIZE) {
          errors.push(`Adding "${file.name}" would exceed the 10MB total size limit.`)
          continue
        }
        total += file.size
        validItems.push({
          id: `${buildFileKey(file)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file
        })
      }

      if (errors.length) errors.forEach((m) => notifications.fileValidationError(m))
      if (!validItems.length) return

      setState((s) => ({ ...s, files: [...s.files, ...validItems], error: null }))
      // fire and forget processing
      void processNewFiles(validItems)
    },
    [notifications, state.files, processNewFiles]
  )

  // Remove a specific file
  const removeFile = useCallback((fileToRemove: File) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((it) => it.file !== fileToRemove),
      processedFiles: prev.processedFiles.filter((pf) => pf.filename !== fileToRemove.name)
    }))
  }, [])

  // Since processing happens on add, just return current processed files
  const processFiles = useCallback(
    async (): Promise<ProcessedFile[]> => state.processedFiles,
    [state.processedFiles]
  )

  // Clear all files
  const clearFiles = useCallback(() => {
    setState({
      files: [],
      processedFiles: [],
      isProcessing: false,
      error: null,
      successfulFilesCount: 0
    })
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // Drag and drop handlers
  const dragHandlers = {
    onDragOver: useCallback((e: React.DragEvent) => {
      e.preventDefault()
    }, []),

    onDragLeave: useCallback((e: React.DragEvent) => {
      e.preventDefault()
    }, []),

    onDrop: useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFiles = e.dataTransfer.files
        if (droppedFiles.length > 0) {
          addFiles(droppedFiles)
        }
      },
      [addFiles]
    )
  }

  return { state, addFiles, removeFile, processFiles, clearFiles, clearError, dragHandlers }
}

export default useFileUpload

/**
 * Custom hook for handling temporary file uploads in chat interface
 * Integrates with the main process file processing service
 */

import { useState, useCallback } from 'react'
import { useToast } from '@chakra-ui/react'

export interface ProcessedFile {
  filename: string
  content: string
  size: number
  mimeType: string
  error?: string
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
}

export interface FileUploadHook {
  state: FileUploadState
  addFiles: (files: FileList | File[]) => void
  removeFile: (file: File) => void
  processFiles: () => Promise<ProcessedFile[]>
  clearFiles: () => void
  clearError: () => void
}

// File constraints matching backend
const MAX_FILES = 10
const MAX_FILE_SIZE = 1024 * 1024 // 1MB
const MAX_TOTAL_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['.txt', '.md']

export const useFileUpload = (): FileUploadHook => {
  const [state, setState] = useState<FileUploadState>({
    files: [],
    processedFiles: [],
    isProcessing: false,
    error: null
  })
  const toast = useToast()

  // Validate a single file
  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 1MB.`
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(extension)) {
      return `File "${file.name}" is not supported. Only .txt and .md files are allowed.`
    }

    return null
  }, [])

  // Add files with validation
  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      console.log(
        'addFiles called with:',
        fileArray.map((f) => ({ name: f.name, size: f.size, lastModified: f.lastModified }))
      )

      // Deduplicate within the current batch first
      const uniqueFiles: File[] = []
      const seenFiles = new Set<string>()

      fileArray.forEach((file) => {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`
        if (!seenFiles.has(fileKey)) {
          seenFiles.add(fileKey)
          uniqueFiles.push(file)
        } else {
          console.log('Removing duplicate within batch:', file.name)
        }
      })

      console.log(
        'After dedup - unique files:',
        uniqueFiles.map((f) => f.name)
      )

      // Move validation logic outside setState to prevent duplicate execution
      setState((prevState) => {
        // Check total file count first
        if (prevState.files.length + uniqueFiles.length > MAX_FILES) {
          toast({
            title: 'Too many files',
            description: `Maximum ${MAX_FILES} files allowed`,
            status: 'error',
            duration: 3000,
            isClosable: true
          })
          return prevState
        }

        // Calculate total size including existing files
        const existingSize = prevState.files.reduce((sum, item) => sum + item.file.size, 0)
        let newTotalSize = existingSize

        const validFiles: FileUploadItem[] = []
        const errors: string[] = []

        // Validate each file and check for duplicates (by name, size, and lastModified)
        for (const file of uniqueFiles) {
          console.log('Checking file:', {
            name: file.name,
            size: file.size,
            lastModified: file.lastModified
          })
          console.log(
            'Existing files:',
            prevState.files.map((item) => ({
              name: item.file.name,
              size: item.file.size,
              lastModified: item.file.lastModified
            }))
          )

          const isDuplicate = prevState.files.some(
            (existingItem) =>
              existingItem.file.name === file.name &&
              existingItem.file.size === file.size &&
              existingItem.file.lastModified === file.lastModified
          )

          console.log('Is duplicate:', isDuplicate)

          if (isDuplicate) {
            errors.push(`File "${file.name}" is already added.`)
            continue
          }

          const error = validateFile(file)
          if (error) {
            errors.push(error)
            continue
          }

          newTotalSize += file.size
          if (newTotalSize > MAX_TOTAL_SIZE) {
            errors.push(`Adding "${file.name}" would exceed the 10MB total size limit.`)
            newTotalSize -= file.size // Revert for next calculation
          } else {
            // Assign a unique ID to the file wrapper
            validFiles.push({
              id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              file
            })
          }
        }

        // Show validation errors outside the setState callback
        if (errors.length > 0) {
          // Use setTimeout to show errors after setState completes
          setTimeout(() => {
            errors.forEach((error) => {
              toast({
                title: 'File validation error',
                description: error,
                status: 'error',
                duration: 4000,
                isClosable: true
              })
            })
          }, 0)
        }

        // Add valid files to state
        if (validFiles.length > 0) {
          console.log(
            'Adding valid files to state:',
            validFiles.map((f) => f.file.name)
          )
          return {
            ...prevState,
            files: [...prevState.files, ...validFiles],
            error: null
          }
        }

        return prevState
      })
    },
    [validateFile, toast]
  )

  // Remove a specific file
  const removeFile = useCallback((fileToRemove: FileUploadItem) => {
    setState((prevState) => ({
      ...prevState,
      files: prevState.files.filter((item) => item.id !== fileToRemove.id),
      processedFiles: prevState.processedFiles.filter(
        (processed) => processed.filename !== fileToRemove.file.name
      )
    }))
  }, [])

  // Process files using the main process service
  const processFiles = useCallback(async (): Promise<ProcessedFile[]> => {
    console.log('processFiles called with files:', state.files.length)
    if (state.files.length === 0) {
      console.log('No files to process, returning empty array')
      return []
    }

    console.log('Setting isProcessing to true, starting file processing...')
    setState((prevState) => ({
      ...prevState,
      isProcessing: true,
      error: null
    }))

    try {
      // Create temporary files and get their paths
      const fileInfos = await Promise.all(
        state.files.map(async (item) => {
          const file = item.file
          // Read file content
          const buffer = await file.arrayBuffer()
          const content = new TextDecoder().decode(buffer)

          // For temporary files, we'll pass the content directly to the main process
          // The main process will handle creating temporary files as needed
          return {
            name: file.name,
            path: file.name, // Use filename as path for temporary processing
            size: file.size,
            content // Pass content directly
          }
        })
      )

      // Call the main process file processing service with content
      console.log(
        'Calling main process file processing with files:',
        fileInfos.map((f) => ({ name: f.name, size: f.size }))
      )
      const result = await window.knowlex.file.processTempContent({
        files: fileInfos.map((info) => ({
          name: info.name,
          content: info.content,
          size: info.size
        }))
      })

      console.log('File processing result:', result)
      if (!result.success) {
        throw new Error(result.error || 'Failed to process files')
      }

      const processedFiles = result.data || []
      console.log(
        'Processed files:',
        processedFiles.map((f) => ({
          filename: f.filename,
          error: f.error,
          contentLength: f.content?.length
        }))
      )

      setState((prevState) => ({
        ...prevState,
        processedFiles,
        isProcessing: false
      }))

      // Show success toast for successfully processed files
      const successfulFiles = processedFiles.filter((f) => !f.error)
      if (successfulFiles.length > 0) {
        toast({
          title: 'Files processed',
          description: `Successfully processed ${successfulFiles.length} file(s)`,
          status: 'success',
          duration: 3000,
          isClosable: true
        })
      }

      // Show error toasts for failed files
      const failedFiles = processedFiles.filter((f) => f.error)
      failedFiles.forEach((file) => {
        toast({
          title: 'File processing failed',
          description: `${file.filename}: ${file.error}`,
          status: 'error',
          duration: 5000,
          isClosable: true
        })
      })

      return processedFiles
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process files'

      setState((prevState) => ({
        ...prevState,
        error: errorMessage,
        isProcessing: false
      }))

      toast({
        title: 'File processing error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true
      })

      throw error
    }
  }, [state.files, toast])

  // Clear all files
  const clearFiles = useCallback(() => {
    setState({
      files: [],
      processedFiles: [],
      isProcessing: false,
      error: null
    })
  }, [])

  // Clear error state
  const clearError = useCallback(() => {
    setState((prevState) => ({
      ...prevState,
      error: null
    }))
  }, [])

  return {
    state,
    addFiles,
    removeFile,
    processFiles,
    clearFiles,
    clearError
  }
}

export default useFileUpload

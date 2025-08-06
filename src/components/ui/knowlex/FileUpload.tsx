/**
 * FileUpload Component - Comprehensive file upload component
 *
 * This component provides:
 * - Drag and drop file upload
 * - File type and size validation
 * - Upload progress tracking
 * - Batch upload support
 * - File preview capabilities
 * - Error handling and retry
 * - Accessibility support
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  List,
  ListItem,
  IconButton,
  Badge,
  Flex,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'

// Import design system hooks and components
import { useColors, useAnimations } from '@/hooks'
import { Icon, UploadIcon, DeleteIcon, CheckIcon, WarningIcon, CloseIcon } from '../common'

// File upload types
export interface FileUploadItem {
  _id: string
  file: File
  name: string
  size: number
  type: string
  _status: 'pending' | 'uploading' | 'completed' | 'error'
  progress: number
  error?: string
}

export interface FileUploadProps {
  /**
   * Accepted file types (e.g., '.txt,.md')
   */
  accept?: string

  /**
   * Maximum file size in bytes
   */
  maxSize?: number

  /**
   * Maximum number of files
   */
  maxFiles?: number

  /**
   * Whether to allow multiple file selection
   */
  multiple?: boolean

  /**
   * Whether the upload area is disabled
   */
  disabled?: boolean

  /**
   * Custom upload handler
   */
  onUpload?: (files: File[]) => Promise<void>

  /**
   * Callback for file validation errors
   */
  onError?: (error: string) => void

  /**
   * Callback for upload progress
   */
  onProgress?: (fileId: string, progress: number) => void

  /**
   * Callback for successful uploads
   */
  onSuccess?: (files: FileUploadItem[]) => void

  /**
   * Initial files to display
   */
  initialFiles?: FileUploadItem[]

  /**
   * Custom upload area content
   */
  children?: React.ReactNode

  /**
   * Whether to show file list
   */
  showFileList?: boolean

  /**
   * Whether to show upload progress
   */
  showProgress?: boolean
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = '.txt, .md',
  maxSize = 1024 * 1024, // 1MB
  maxFiles = 10,
  multiple = true,
  disabled = false,
  onUpload,
  onError,
  onProgress,
  onSuccess,
  initialFiles = [],
  children,
  showFileList = true,
  showProgress = true,
}) => {
  const { t } = useTranslation()
  const _colors = useColors()
  const animations = useAnimations()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [files, setFiles] = useState<FileUploadItem[]>(initialFiles)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Color mode values
  const dropzoneBg = useColorModeValue('gray.50', 'dark.100')
  const dropzoneBorderColor = useColorModeValue('gray.300', 'dark.400')
  const activeBg = useColorModeValue('primary.50', 'primary.900')
  const activeBorderColor = useColorModeValue('primary.300', 'primary.600')

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }, [])

  // File validation
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxSize) {
        return t('error.fileTooLarge', { max: formatFileSize(maxSize) })
      }

      // Check file type
      if (accept) {
        const acceptedTypes = accept.split(',').map(type => type.trim())
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
        const mimeType = file.type.toLowerCase()

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) {
            return fileExtension === type.toLowerCase()
          }
          return mimeType.includes(type.toLowerCase())
        })

        if (!isAccepted) {
          return t('error.unsupportedFormat')
        }
      }

      return null
    },
    [accept, maxSize, t, formatFileSize]
  )

  // Handle file selection
  const handleFiles = useCallback(
    (selectedFiles: File[]) => {
      if (disabled) return

      setUploadError(null)

      // Validate file count
      if (files.length + selectedFiles.length > maxFiles) {
        const error = t('ui.file.tooManyFiles', { max: maxFiles })
        setUploadError(error)
        onError?.(error)
        return
      }

      // Process and validate files
      const newFiles: FileUploadItem[] = []
      const errors: string[] = []

      selectedFiles.forEach(file => {
        const validationError = validateFile(file)
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`)
          return
        }

        const fileItem: FileUploadItem = {
          _id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          _status: 'pending',
          progress: 0,
        }

        newFiles.push(fileItem)
      })

      if (errors.length > 0) {
        const error = errors.join(', ')
        setUploadError(error)
        onError?.(error)
      }

      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles])
      }
    },
    [disabled, files.length, maxFiles, validateFile, t, onError]
  )

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop: handleFiles,
    accept: accept
      ? accept.split(',').reduce((acc, type) => ({ ...acc, [type.trim()]: [] }), {})
      : undefined,
    disabled,
    multiple,
    maxSize,
  })

  // Start upload process
  const startUpload = async () => {
    if (!onUpload || isUploading) return

    const pendingFiles = files.filter(f => f._status === 'pending' || f._status === 'error')
    if (pendingFiles.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Update files to uploading _status
      setFiles(prev =>
        prev.map(f =>
          pendingFiles.some(pf => pf._id === f._id)
            ? { ...f, _status: 'uploading' as const, progress: 0, error: undefined }
            : f
        )
      )

      // Simulate upload progress (replace with actual upload logic)
      for (const fileItem of pendingFiles) {
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))

          setFiles(prev => prev.map(f => (f._id === fileItem._id ? { ...f, progress } : f)))

          onProgress?.(fileItem._id, progress)
        }

        // Mark as completed
        setFiles(prev =>
          prev.map(f => (f._id === fileItem._id ? { ...f, _status: 'completed' as const } : f))
        )
      }

      // Call upload handler
      await onUpload(pendingFiles.map(f => f.file))

      onSuccess?.(files.filter(f => f._status === 'completed'))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('error.uploadFailed')
      setUploadError(errorMessage)

      // Mark failed files as error
      setFiles(prev =>
        prev.map(f =>
          pendingFiles.some(pf => pf._id === f._id)
            ? { ...f, _status: 'error' as const, error: errorMessage }
            : f
        )
      )

      onError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  // Remove file
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f._id !== fileId))
  }

  // Retry failed upload
  const retryFile = (fileId: string) => {
    setFiles(prev =>
      prev.map(f =>
        f._id === fileId ? { ...f, _status: 'pending' as const, error: undefined } : f
      )
    )
  }

  // Get upload progress
  const uploadProgress =
    files.length > 0
      ? (files.filter(f => f._status === 'completed').length / files.length) * 100
      : 0

  const hasFiles = files.length > 0
  const hasErrors = files.some(f => f._status === 'error')
  const canUpload = (files.some(f => f._status === 'pending') || hasErrors) && !isUploading

  return (
    <VStack spacing={4} align="stretch">
      {/* Upload Area */}
      <Box
        {...getRootProps()}
        p={8}
        border="2px dashed"
        borderColor={
          isDragActive ? activeBorderColor : isDragReject ? 'error.300' : dropzoneBorderColor
        }
        borderRadius="lg"
        bg={isDragActive ? activeBg : dropzoneBg}
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.6 : 1}
        transition={animations.transitions.fast}
        _hover={!disabled ? { borderColor: activeBorderColor, bg: activeBg } : {}}
      >
        <input {...getInputProps()} ref={fileInputRef} />

        {children || (
          <VStack spacing={4}>
            <UploadIcon size="xl" color={isDragActive ? 'primary.500' : 'text.muted'} />

            <VStack spacing={2}>
              <Text fontSize="lg" fontWeight="medium" textAlign="center">
                {isDragActive ? t('ui.file.dropHere') : t('ui.file.dragDropFiles')}
              </Text>

              <Text fontSize="sm" color="text.muted" textAlign="center">
                {t('ui.file.supportedTypes', { types: accept })}
              </Text>

              <Text fontSize="sm" color="text.muted" textAlign="center">
                {t('ui.file.maxSize', { size: formatFileSize(maxSize) })}
              </Text>
            </VStack>

            <Button size="md" variant="outline" isDisabled={disabled}>
              {t('ui.file.browseFiles')}
            </Button>
          </VStack>
        )}
      </Box>

      {/* Error Alert */}
      {uploadError && (
        <Alert _status="error" borderRadius="md">
          <AlertIcon />
          <Box flex={1}>
            <AlertTitle>{t('error.uploadFailed')}</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Box>
          <IconButton
            size="sm"
            variant="ghost"
            icon={<CloseIcon />}
            onClick={() => setUploadError(null)}
            aria-label={t('common.actions.close')}
          />
        </Alert>
      )}

      {/* Upload Progress */}
      {showProgress && hasFiles && (
        <Box>
          <Flex justify="space-between" mb={2}>
            <Text fontSize="sm" color="text.muted">
              {t('ui.file.uploadProgress')}
            </Text>
            <Text fontSize="sm" color="text.muted">
              {files.filter(f => f._status === 'completed').length} / {files.length}
            </Text>
          </Flex>
          <Progress value={uploadProgress} colorScheme="primary" borderRadius="md" />
        </Box>
      )}

      {/* File List */}
      {showFileList && hasFiles && (
        <Box>
          <HStack justify="space-between" mb={3}>
            <Text fontSize="md" fontWeight="medium">
              {t('ui.file.files')} ({files.length})
            </Text>

            {canUpload && (
              <Button
                size="sm"
                onClick={startUpload}
                isLoading={isUploading}
                loadingText={t('common._status.uploading')}
              >
                {t('common.actions.upload')}
              </Button>
            )}
          </HStack>

          <List spacing={2}>
            {files.map(fileItem => (
              <ListItem key={fileItem._id}>
                <HStack p={3} bg={_colors.background.surface} borderRadius="md" spacing={3}>
                  {/* File Status Icon */}
                  <Box>
                    {fileItem._status === 'uploading' ? (
                      <CircularProgress size="24px" value={fileItem.progress} color="primary.500">
                        <CircularProgressLabel fontSize="xs">
                          {fileItem.progress}%
                        </CircularProgressLabel>
                      </CircularProgress>
                    ) : fileItem._status === 'completed' ? (
                      <CheckIcon color="success.500" />
                    ) : fileItem._status === 'error' ? (
                      <WarningIcon color="error.500" />
                    ) : (
                      <Icon path="file" color="text.muted" />
                    )}
                  </Box>

                  {/* File Info */}
                  <VStack align="flex-start" spacing={0} flex={1} minW={0}>
                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                      {fileItem.name}
                    </Text>
                    <HStack spacing={2}>
                      <Text fontSize="xs" color="text.muted">
                        {formatFileSize(fileItem.size)}
                      </Text>
                      <Badge
                        size="sm"
                        colorScheme={
                          fileItem._status === 'completed'
                            ? 'green'
                            : fileItem._status === 'error'
                              ? 'red'
                              : fileItem._status === 'uploading'
                                ? 'blue'
                                : 'gray'
                        }
                      >
                        {t(`common._status.${fileItem._status}`)}
                      </Badge>
                    </HStack>
                    {fileItem.error && (
                      <Text fontSize="xs" color="error.500">
                        {fileItem.error}
                      </Text>
                    )}
                  </VStack>

                  {/* Actions */}
                  <HStack spacing={1}>
                    {fileItem._status === 'error' && (
                      <IconButton
                        size="sm"
                        variant="ghost"
                        icon={<Icon path="refresh" />}
                        onClick={() => retryFile(fileItem._id)}
                        aria-label={t('common.actions.retry')}
                      />
                    )}
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<DeleteIcon />}
                      onClick={() => removeFile(fileItem._id)}
                      aria-label={t('common.actions.delete')}
                    />
                  </HStack>
                </HStack>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </VStack>
  )
}

export default FileUpload

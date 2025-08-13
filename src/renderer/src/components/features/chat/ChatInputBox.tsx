import React, { useState, useRef, useCallback } from 'react'
import {
  Box,
  HStack,
  VStack,
  Textarea,
  IconButton,
  useColorModeValue,
  Text,
  useToast
} from '@chakra-ui/react'
import { ArrowUpIcon, AttachmentIcon } from '@chakra-ui/icons'
import { useSendMessage, useIsSending } from '../../../stores/conversation'
import FilePreview from './FilePreview'

// File upload constants
const MAX_FILES = 10
const MAX_FILE_SIZE = 1024 * 1024 // 1MB
const ALLOWED_TYPES = ['.txt', '.md', '.pdf', '.docx', '.json', '.csv']

// ChatInputBoxPayload interface
export interface ChatInputBoxPayload {
  input: string
  files: File[]
  attachments?: FileAttachment[]
}

export interface FileAttachment {
  file: File
  content?: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
}

export type ChatInputVariant = 'main-entrance' | 'conversation'

export interface ChatInputBoxProps {
  /** Current conversation ID (required for conversation variant) */
  conversationId?: string
  /** Input variant determines styling and behavior */
  variant?: ChatInputVariant
  /** Whether the input is disabled */
  disabled?: boolean
  /** Custom placeholder text (overrides variant defaults) */
  placeholder?: string
  /** Whether to show file attachment button */
  showFileAttachment?: boolean
  /** Whether to show helper text */
  showHelperText?: boolean
  /** Additional CSS classes */
  className?: string
  /** Custom send handler (used for main-entrance variant) */
  onSendMessage?: (message: string, files: File[]) => Promise<void>
}

/**
 * Unified chat input box component
 *
 * Variants:
 * - main-entrance: Centered, rounded design for main app entrance
 * - conversation: Bottom-positioned with full features for existing chats
 */
export const ChatInputBox: React.FC<ChatInputBoxProps> = ({
  conversationId,
  variant = 'conversation',
  disabled = false,
  placeholder,
  showFileAttachment = true,
  showHelperText = true,
  className,
  onSendMessage
}) => {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMessage = useSendMessage()
  const isSending = useIsSending()
  const toast = useToast()

  // Theme colors
  const borderColor = useColorModeValue('border.secondary', 'border.secondary')
  const bgColor = useColorModeValue('surface.primary', 'surface.primary')
  const placeholderColor = useColorModeValue('text.tertiary', 'text.tertiary')

  // Get default placeholder based on variant
  const getDefaultPlaceholder = (): string => {
    switch (variant) {
      case 'main-entrance':
        return 'Ask Knowlex about anything ...'
      case 'conversation':
        return '' // No placeholder when there are messages
      default:
        return 'Type your message...'
    }
  }

  const effectivePlaceholder = placeholder ?? getDefaultPlaceholder()

  // File validation
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 1MB.`
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_TYPES.includes(extension)) {
      return `File "${file.name}" is not supported. Only .txt and .md files are allowed.`
    }

    return null
  }

  // Handle file upload
  const handleFileUpload = useCallback(
    (newFiles: FileList) => {
      const fileArray = Array.from(newFiles)
      const validFiles: File[] = []
      const errors: string[] = []

      // Check total file count
      if (files.length + fileArray.length > MAX_FILES) {
        toast({
          title: 'Too many files',
          description: `Maximum ${MAX_FILES} files allowed`,
          status: 'error',
          duration: 3000,
          isClosable: true
        })
        return
      }

      // Validate each file
      fileArray.forEach((file) => {
        const error = validateFile(file)
        if (error) {
          errors.push(error)
        } else {
          validFiles.push(file)
        }
      })

      // Show validation errors
      if (errors.length > 0) {
        errors.forEach((error) => {
          toast({
            title: 'File validation error',
            description: error,
            status: 'error',
            duration: 4000,
            isClosable: true
          })
        })
      }

      // Add valid files
      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles])
      }
    },
    [files.length, toast]
  )

  // Remove file
  const removeFile = useCallback((fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove))
  }, [])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles.length > 0) {
        handleFileUpload(droppedFiles)
      }
    },
    [handleFileUpload]
  )

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setInput(value)

      // Auto-resize with different limits based on variant
      const textarea = textareaRef.current
      if (textarea) {
        const minHeight = 32 // 2rem = 32px
        const maxHeight = variant === 'main-entrance' ? 120 : 200

        // Only resize if there are line breaks, otherwise keep minimum height
        if (value.includes('\n')) {
          textarea.style.height = 'auto'
          const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight))
          textarea.style.height = `${newHeight}px`
        } else {
          textarea.style.height = '2rem'
        }
      }
    },
    [variant]
  )

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if ((!trimmedInput && files.length === 0) || isSending || disabled) return

    // Add to input history if not empty and not already in history
    if (trimmedInput && !inputHistory.includes(trimmedInput)) {
      setInputHistory((prev) => [trimmedInput, ...prev].slice(0, 50)) // Keep last 50 entries
    }
    setHistoryIndex(-1)

    // Store original values for potential error recovery
    const originalInput = trimmedInput
    const originalFiles = [...files]

    try {
      // Clear input and files immediately for better UX
      setInput('')
      setFiles([])
      if (textareaRef.current) {
        textareaRef.current.style.height = '2rem'
      }

      // Use custom handler for main-entrance variant
      if (onSendMessage && variant === 'main-entrance') {
        await onSendMessage(originalInput, originalFiles)
      }
      // Use store sendMessage for conversation variant
      else if (conversationId && variant === 'conversation') {
        const content = [{ type: 'text' as const, text: originalInput }]
        await sendMessage(conversationId, content, originalFiles)
      }
      // If conversationId is provided but variant is main-entrance, use store sendMessage
      else if (conversationId) {
        const content = [{ type: 'text' as const, text: originalInput }]
        await sendMessage(conversationId, content, originalFiles)
      }
    } catch (error) {
      // If error, restore the input and files
      setInput(originalInput)
      setFiles(originalFiles)
      console.error('Failed to send message:', error)
    }
  }, [
    input,
    files,
    isSending,
    disabled,
    conversationId,
    sendMessage,
    inputHistory,
    onSendMessage,
    variant
  ])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter key sends message for all variants (Shift+Enter for new line)
        e.preventDefault()
        handleSend()
      } else if (e.key === 'ArrowUp' && e.altKey && inputHistory.length > 0) {
        // Navigate input history with Alt+Up/Down
        e.preventDefault()
        const newIndex = Math.min(historyIndex + 1, inputHistory.length - 1)
        setHistoryIndex(newIndex)
        setInput(inputHistory[newIndex])
      } else if (e.key === 'ArrowDown' && e.altKey && inputHistory.length > 0) {
        e.preventDefault()
        const newIndex = historyIndex > 0 ? historyIndex - 1 : -1
        setHistoryIndex(newIndex)
        setInput(newIndex >= 0 ? inputHistory[newIndex] : '')
      }
    },
    [handleSend, inputHistory, historyIndex]
  )

  // Can send message?
  const canSend = (input.trim().length > 0 || files.length > 0) && !isSending && !disabled

  // Get helper text based on variant
  const getHelperText = (): string => {
    switch (variant) {
      case 'main-entrance':
        return 'Press Enter to send • Drag & drop files'
      case 'conversation':
        return 'Press Enter to send • Alt+↑/↓ for history • Shift+Enter for new line'
      default:
        return 'Press Enter to send • Alt+↑/↓ for history • Shift+Enter for new line'
    }
  }

  // Unified render - single implementation for all variants
  return (
    <Box
      p={variant === 'main-entrance' ? 0 : 4}
      className={className}
      maxW="752px"
      w="full"
      mx="auto"
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      {/* File Previews */}
      {files.length > 0 && (
        <VStack spacing={2} mb={4} align="stretch">
          {files.map((file, index) => (
            <FilePreview
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => removeFile(file)}
            />
          ))}
        </VStack>
      )}

      {/* Unified Input Area */}
      <Box
        bg={bgColor}
        border="1px solid"
        borderColor={isDragOver ? 'blue.300' : borderColor}
        borderRadius="xl"
        p={3}
        shadow="sm"
        _hover={{ shadow: 'button-hover' }}
        _focusWithin={{
          borderColor: 'primary.500',
          shadow: 'button-hover'
        }}
        transition="all 0.2s"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <HStack spacing={3} align="end">
          {/* File Upload Button */}
          {showFileAttachment && (
            <>
              <IconButton
                aria-label="Attach file"
                icon={<AttachmentIcon />}
                size="sm"
                variant="ghost"
                borderRadius="full"
                isDisabled={disabled || files.length >= MAX_FILES}
                onClick={() => fileInputRef.current?.click()}
              />

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files)
                  }
                  e.target.value = ''
                }}
              />
            </>
          )}

          {/* Text Input */}
          <Box flex={1}>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={effectivePlaceholder}
              resize="none"
              minH="2rem"
              h="2rem"
              maxH={variant === 'main-entrance' ? '120px' : '200px'}
              border="none"
              py={1}
              px={0}
              _focus={{ boxShadow: 'none' }}
              _placeholder={{ color: placeholderColor }}
              bg="transparent"
              isDisabled={disabled}
            />
          </Box>

          {/* Send Button */}
          <IconButton
            aria-label="Send message"
            icon={<ArrowUpIcon />}
            colorScheme="primary"
            size="sm"
            borderRadius="md"
            isDisabled={!canSend}
            isLoading={isSending}
            onClick={handleSend}
          />
        </HStack>
      </Box>

      {/* Helper Text */}
      {showHelperText && (
        <Text
          fontSize="xs"
          color="text.tertiary"
          mt={2}
          textAlign={variant === 'conversation' ? 'left' : 'center'}
        >
          {getHelperText()}
        </Text>
      )}
    </Box>
  )
}

ChatInputBox.displayName = 'ChatInputBox'

export default ChatInputBox

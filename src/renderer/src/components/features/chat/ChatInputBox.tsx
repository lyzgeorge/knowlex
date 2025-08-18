import React, { useState, useRef, useCallback } from 'react'
import { Box, HStack, Textarea, IconButton, useColorModeValue } from '@chakra-ui/react'
import { ArrowUpIcon, AttachmentIcon, RepeatIcon } from '@chakra-ui/icons'
import { FaStop } from 'react-icons/fa'
import { keyframes } from '@emotion/react'
import {
  useSendMessage,
  useIsSending,
  useIsStreaming,
  useStreamingMessageId,
  useStopStreaming
} from '../../../stores/conversation'
import TempFileCard from './TempFileCard'
import { useFileUpload, FileUploadItem } from '../../../hooks/useFileUpload'
import type { TemporaryFileResult } from '../../../../shared/types'

// Animation for refresh icon
const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

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
  /** Additional CSS classes */
  className?: string
  /** Custom send handler (used for main-entrance variant) */
  onSendMessage?: (
    message: string,
    files: File[],
    temporaryFiles?: TemporaryFileResult[]
  ) => Promise<void>
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
  className,
  onSendMessage
}) => {
  const [input, setInput] = useState('')
  const [isHoveringStreamButton, setIsHoveringStreamButton] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastFileUploadRef = useRef<number>(0)
  const sendMessage = useSendMessage()
  const isSending = useIsSending()
  const isStreaming = useIsStreaming()
  const streamingMessageId = useStreamingMessageId()
  const stopStreaming = useStopStreaming()

  // Use the file upload hook
  const fileUpload = useFileUpload()

  // Theme colors
  const bgColor = useColorModeValue('surface.primary', 'surface.primary')
  const placeholderColor = useColorModeValue('text.tertiary', 'text.tertiary')

  // Get default placeholder based on variant
  const getDefaultPlaceholder = (): string => {
    switch (variant) {
      case 'main-entrance':
        return 'Ask a question about ...'
      case 'conversation':
        return '' // No placeholder when there are messages
      default:
        return 'Type your message...'
    }
  }

  const effectivePlaceholder = placeholder ?? getDefaultPlaceholder()

  // Handle file upload using the hook with deduplication
  const handleFileUpload = useCallback(
    (newFiles: FileList) => {
      const now = Date.now()
      // Prevent duplicate calls within 100ms
      if (now - lastFileUploadRef.current < 100) {
        console.log('Preventing duplicate file upload call within 100ms')
        return
      }
      lastFileUploadRef.current = now

      console.log(
        'handleFileUpload called with files:',
        Array.from(newFiles).map((f) => f.name)
      )
      fileUpload.addFiles(newFiles)
    },
    [fileUpload]
  )

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()

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

  // Handle stop streaming
  const handleStop = useCallback(async () => {
    if (streamingMessageId) {
      try {
        await stopStreaming(streamingMessageId)
      } catch (error) {
        console.error('Failed to stop streaming:', error)
      }
    }
  }, [streamingMessageId, stopStreaming])

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    const hasFiles = fileUpload.state.files.length > 0

    if ((!trimmedInput && !hasFiles) || isSending || disabled) return

    // Store original values for potential error recovery
    const originalInput = trimmedInput
    const originalFiles = [...fileUpload.state.files]

    try {
      console.log('handleSend: Starting message send process', {
        trimmedInput,
        hasFiles,
        fileCount: fileUpload.state.files.length,
        variant,
        conversationId,
        onSendMessage: !!onSendMessage
      })

      // Process temporary files if any
      let processedFiles: TemporaryFileResult[] = []
      if (hasFiles) {
        console.log('handleSend: Processing files...')
        processedFiles = await fileUpload.processFiles()
        console.log(
          'handleSend: Files processed:',
          processedFiles.map((f) => ({ filename: f.filename, error: f.error }))
        )
      } else {
        console.log('handleSend: No files to process')
      }

      // Clear input and files immediately for better UX
      setInput('')
      fileUpload.clearFiles()
      if (textareaRef.current) {
        textareaRef.current.style.height = '2rem'
      }

      // Use custom handler for main-entrance variant
      if (onSendMessage && variant === 'main-entrance') {
        console.log('handleSend: Using main-entrance variant with custom handler')
        await onSendMessage(originalInput, [], processedFiles)
      }
      // Use store sendMessage for conversation variant
      else if (conversationId && variant === 'conversation') {
        console.log('handleSend: Using conversation variant, conversationId:', conversationId)
        const content = []

        // Add text content part only if there's actual text
        if (originalInput.trim().length > 0) {
          content.push({ type: 'text' as const, text: originalInput })
        }

        // Add temporary file content parts or image parts
        console.log(
          'handleSend: Adding file content to message, processedFiles count:',
          processedFiles.length
        )
        processedFiles.forEach((file) => {
          if (!file.error) {
            console.log('handleSend: Adding file to content:', {
              filename: file.filename,
              contentLength: file.content?.length,
              isImage: file.isImage
            })

            if (file.isImage) {
              // Add as image content part
              content.push({
                type: 'image' as const,
                image: {
                  url: file.content, // This is a data URL
                  alt: file.filename,
                  mimeType: file.mimeType,
                  size: file.size
                }
              })
            } else {
              // Add as temporary file content part
              content.push({
                type: 'temporary-file' as const,
                temporaryFile: {
                  filename: file.filename,
                  content: file.content,
                  size: file.size,
                  mimeType: file.mimeType
                }
              })
            }
          } else {
            console.log('handleSend: Skipping file due to error:', {
              filename: file.filename,
              error: file.error
            })
          }
        })

        console.log(
          'handleSend: Final message content structure:',
          content.map((c) => ({
            type: c.type,
            ...(c.type === 'text'
              ? { textLength: c.text?.length }
              : c.type === 'image'
                ? { filename: c.image?.alt, url: c.image?.url?.substring(0, 50) + '...' }
                : { filename: c.temporaryFile?.filename })
          }))
        )
        await sendMessage(conversationId, content)
      } else {
        console.log('handleSend: No matching path found!', {
          onSendMessage: !!onSendMessage,
          variant,
          conversationId,
          hasProcessedFiles: processedFiles.length > 0
        })
      }
    } catch (error) {
      // If error, restore the input and files
      setInput(originalInput)
      // Clear current files and restore original files
      fileUpload.clearFiles()
      if (originalFiles.length > 0) {
        // Extract File objects from FileUploadItem
        const filesToRestore = originalFiles.map((item) => item.file)
        fileUpload.addFiles(filesToRestore)
      }
      console.error('Failed to send message:', error)
    }
  }, [input, fileUpload, isSending, disabled, conversationId, sendMessage, onSendMessage, variant])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter key sends message for all variants (Shift+Enter for new line)
        // Block during streaming
        if (isStreaming && streamingMessageId) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, isStreaming, streamingMessageId]
  )

  // Button state logic
  const hasContent = input.trim().length > 0 || fileUpload.state.files.length > 0
  const isGenerating = isStreaming && streamingMessageId
  const canSend =
    hasContent && !isSending && !disabled && !fileUpload.state.isProcessing && !isGenerating

  // Unified render - single implementation for all variants
  return (
    <Box
      p={4}
      className={className}
      maxW="752px"
      w="full"
      mx="auto"
      style={{ WebkitAppRegion: 'no-drag' }}
    >
      {/* Unified Input Area */}
      <Box
        bg={bgColor}
        borderRadius="xl"
        p={3}
        shadow="sm"
        _hover={{ shadow: 'button-hover' }}
        _focusWithin={{
          shadow: 'button-hover'
        }}
        transition="all 0.2s"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* File Previews - Inside chatbox, above input controls */}
        {fileUpload.state.files.length > 0 && (
          <Box mb={3}>
            <HStack
              spacing={2}
              overflowX="auto"
              maxW="100%"
              pb={2}
              sx={{
                '&::-webkit-scrollbar': {
                  height: '4px'
                },
                '&::-webkit-scrollbar-track': {
                  bg: 'transparent'
                },
                '&::-webkit-scrollbar-thumb': {
                  bg: 'gray.300',
                  borderRadius: '2px'
                }
              }}
            >
              {fileUpload.state.files.map((fileItem: FileUploadItem) => (
                <TempFileCard
                  key={fileItem.id}
                  file={fileItem.file}
                  onRemove={() => fileUpload.removeFile(fileItem)}
                  variant="compact"
                />
              ))}
            </HStack>
          </Box>
        )}

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
                isDisabled={disabled || fileUpload.state.files.length >= 10}
                onClick={() => fileInputRef.current?.click()}
              />

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.docx,.pptx,.xlsx,.odt,.odp,.ods,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
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

          {/* Send/Stop Button */}
          {isGenerating ? (
            // State 4: When assistant is generating, show refresh button with spin animation
            // On hover, show red stop button
            <IconButton
              aria-label={isHoveringStreamButton ? 'Stop streaming' : 'Generating response'}
              icon={
                isHoveringStreamButton ? (
                  <FaStop />
                ) : (
                  <RepeatIcon
                    css={{
                      animation: `${spinAnimation} 1s linear infinite`
                    }}
                  />
                )
              }
              variant={isHoveringStreamButton ? 'solid' : 'solid'}
              colorScheme={isHoveringStreamButton ? 'red' : 'primary'}
              size="sm"
              borderRadius="md"
              onClick={isHoveringStreamButton ? handleStop : undefined}
              onMouseEnter={() => setIsHoveringStreamButton(true)}
              onMouseLeave={() => setIsHoveringStreamButton(false)}
              cursor={isHoveringStreamButton ? 'pointer' : 'default'}
              bg={isHoveringStreamButton ? undefined : 'gray.300'}
            />
          ) : (
            // State 1, 2, 5: Send button with proper enabled/disabled states
            <IconButton
              aria-label="Send message"
              icon={<ArrowUpIcon />}
              colorScheme={canSend ? 'primary' : undefined}
              color={canSend ? undefined : undefined}
              size="sm"
              borderRadius="md"
              isDisabled={!canSend}
              isLoading={isSending || fileUpload.state.isProcessing}
              onClick={handleSend}
              cursor={canSend ? 'pointer' : 'not-allowed'}
            />
          )}
        </HStack>
      </Box>
    </Box>
  )
}

ChatInputBox.displayName = 'ChatInputBox'

export default ChatInputBox

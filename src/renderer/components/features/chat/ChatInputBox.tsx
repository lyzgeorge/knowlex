import React, { useState, useRef, useCallback } from 'react'
import { Box, IconButton, useColorModeValue } from '@chakra-ui/react'
import { ArrowUpIcon, AttachmentIcon, RepeatIcon } from '@chakra-ui/icons'
import { FaStop } from 'react-icons/fa'
import { keyframes } from '@emotion/react'
import {
  useSendMessage,
  useIsSending,
  useIsStreaming,
  useStreamingMessageId,
  useStopStreaming,
  useCurrentConversation,
  useIsReasoningStreaming,
  useReasoningStreamingMessageId
} from '../../../stores/conversation'
import { useMessageBranching } from '../../../hooks/useMessageBranching'
import { TempFileCard, TempFileCardList, AutoResizeTextarea } from '../../ui'
import {
  useFileUpload,
  FileUploadItem,
  ProcessedFile,
  getFileAcceptString,
  getFileConstraints
} from '../../../hooks/useFileUpload'
import type { Message, MessageContent } from '@shared/types/message'

// Animation for refresh icon
const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export type ChatInputVariant = 'main-entrance' | 'conversation'

export interface ChatInputBoxProps {
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
  /** Optional externally managed branching context (to avoid duplicate hook state) */
  branching?: {
    filteredMessages: Message[]
  }
}

/**
 * Unified chat input box component
 *
 * Variants:
 * - main-entrance: Centered, rounded design for main app entrance
 * - conversation: Bottom-positioned with full features for existing chats
 */
export const ChatInputBox: React.FC<ChatInputBoxProps> = ({
  variant = 'conversation',
  disabled = false,
  placeholder,
  showFileAttachment = true,
  className,
  branching
}) => {
  const [input, setInput] = useState('')
  const [isHoveringStreamButton, setIsHoveringStreamButton] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMessage = useSendMessage()
  const isSending = useIsSending()
  const isStreaming = useIsStreaming()
  const streamingMessageId = useStreamingMessageId()
  const stopStreaming = useStopStreaming()
  const isReasoningStreaming = useIsReasoningStreaming()
  const reasoningStreamingMessageId = useReasoningStreamingMessageId()
  const { currentConversation, currentMessages } = useCurrentConversation()
  // Resolve branching: always call the hook (hooks must be unconditional)
  const internalBranch = !branching
  const branchingResult = useMessageBranching(currentMessages)
  const filteredMessages = internalBranch
    ? branchingResult.filteredMessages
    : branching!.filteredMessages

  // Use the file upload hook
  const fileUpload = useFileUpload()
  const { MAX_FILES } = getFileConstraints()

  // Theme colors
  const bgColor = useColorModeValue('surface.primary', 'surface.primary')
  const placeholderColor = useColorModeValue('text.tertiary', 'text.tertiary')

  // Build message content from text and processed files
  const buildMessageContent = useCallback(
    (text: string, processedFiles: ProcessedFile[] = []): MessageContent => {
      const content: MessageContent = []

      // Add text content part if present
      const trimmedText = text.trim()
      if (trimmedText) {
        content.push({
          type: 'text' as const,
          text: trimmedText
        })
      }

      // Add file content parts (skip files with errors)
      processedFiles.forEach((file) => {
        if (file.error) {
          console.log('buildMessageContent: Skipping file due to error:', {
            filename: file.filename,
            error: file.error
          })
          return
        }

        console.log('buildMessageContent: Adding file to content:', {
          filename: file.filename,
          contentLength: file.content?.length,
          isImage: file.isImage
        })

        if (file.isImage) {
          // Add as image content part (AI SDK compatible format)
          content.push({
            type: 'image' as const,
            image: {
              image: file.content, // DataContent: base64 data URL
              mediaType: file.mimeType,
              filename: file.filename
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
      })

      return content
    },
    []
  )

  // Get default placeholder based on variant
  const getDefaultPlaceholder = (): string => {
    switch (variant) {
      case 'main-entrance':
        return 'Type your message...'
      case 'conversation':
        return 'Type your message...'
      default:
        return 'Type your message...'
    }
  }

  const effectivePlaceholder = placeholder ?? getDefaultPlaceholder()

  // Handle file upload - simplified since hook handles deduplication
  const handleFileUpload = useCallback(
    (newFiles: FileList) => {
      console.log(
        'handleFileUpload called with files:',
        Array.from(newFiles).map((f) => f.name)
      )
      fileUpload.addFiles(newFiles)
    },
    [fileUpload]
  )

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }, [])

  // Handle stop streaming (supports reasoning or text streaming)
  const handleStop = useCallback(async () => {
    const idToStop = streamingMessageId || reasoningStreamingMessageId
    if (!idToStop) return
    try {
      await stopStreaming(idToStop)
    } catch (error) {
      console.error('Failed to stop streaming:', error)
    }
  }, [streamingMessageId, reasoningStreamingMessageId, stopStreaming])

  // Handle send message - unified logic for both variants
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    const hasFiles = fileUpload.state.files.length > 0
    const hasSuccessfulFiles = fileUpload.state.successfulFilesCount > 0

    // Can only send if we have text content OR successful files
    if (
      (!trimmedInput && !hasSuccessfulFiles) ||
      isSending ||
      disabled ||
      fileUpload.state.isProcessing
    )
      return

    // Store original values for potential error recovery
    const originalInput = input
    const originalFiles = [...fileUpload.state.files]

    try {
      console.log('handleSend: Starting message send process', {
        trimmedInput,
        hasFiles,
        fileCount: fileUpload.state.files.length,
        variant
      })

      // Process temporary files if any
      let processedFiles: ProcessedFile[] = []
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
      // height will auto-reset by the AutoResizeTextarea effect when value clears

      // Build message content using internal utility
      const content = buildMessageContent(trimmedInput, processedFiles)

      console.log(
        'handleSend: Final message content structure:',
        content.map((c) => {
          if (c.type === 'text') {
            return { type: c.type, textLength: c.text?.length }
          }
          if (c.type === 'image') {
            return {
              type: c.type,
              imageType: typeof c.image,
              mediaType: c.image?.mediaType,
              isDataUrl: typeof c.image?.image === 'string' && c.image.image.startsWith('data:')
            }
          }
          // temporary-file
          return { type: c.type, filename: c.temporaryFile?.filename || 'file' }
        })
      )

      // Find parent message ID for new message in current conversation chain
      const lastAssistantMessage = filteredMessages
        .slice()
        .reverse()
        .find((msg) => msg.role === 'assistant')

      const sendOptions: { conversationId?: string; parentMessageId?: string } = {}
      if (currentConversation?.id) {
        sendOptions.conversationId = currentConversation.id
      }
      if (lastAssistantMessage?.id) {
        sendOptions.parentMessageId = lastAssistantMessage.id
      }

      console.log('handleSend: Sending with options:', sendOptions)

      // Send message through store - works for both variants
      await sendMessage(content, sendOptions)
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
  }, [
    input,
    fileUpload,
    isSending,
    disabled,
    sendMessage,
    buildMessageContent,
    currentConversation,
    filteredMessages,
    variant
  ])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter key sends message for all variants (Shift+Enter for new line)
        // Block during any refreshing state
        const isRefreshing = isSending || isStreaming || isReasoningStreaming
        if (isRefreshing) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, isSending, isStreaming, isReasoningStreaming]
  )

  // Button state logic (simple and single-purpose)
  const hasTextContent = input.trim().length > 0
  const hasSuccessfulFiles = fileUpload.state.successfulFilesCount > 0
  const isRefreshing = isSending || isStreaming || isReasoningStreaming

  // Can send if:
  // 1. Has text content (always allowed)
  // 2. Or has successful processed files
  // 3. Not currently processing files
  // 4. Not currently refreshing/sending
  const canSend =
    (hasTextContent || hasSuccessfulFiles) &&
    !disabled &&
    !fileUpload.state.isProcessing &&
    !isRefreshing

  // Unified render - single implementation for all variants
  return (
    <Box
      p={4}
      className={className}
      maxW="752px"
      w="full"
      mx="auto"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
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
        onDragOver={fileUpload.dragHandlers.onDragOver}
        onDragLeave={fileUpload.dragHandlers.onDragLeave}
        onDrop={fileUpload.dragHandlers.onDrop}
        minH="3rem"
      >
        {/* File Previews - Inside chatbox, above input controls */}
        {fileUpload.state.files.length > 0 && (
          <TempFileCardList>
            {fileUpload.state.files.map((fileItem: FileUploadItem) => (
              <TempFileCard
                key={fileItem.id}
                file={fileItem.file}
                onRemove={() => fileUpload.removeFile(fileItem.file)}
                variant="compact"
              />
            ))}
          </TempFileCardList>
        )}

        {/* Two-row layout */}
        <Box display="flex" flexDirection="column">
          {/* First row: Text Input */}
          <Box px="0.5rem" py="0.25rem">
            <AutoResizeTextarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={effectivePlaceholder}
              maxRows={3}
              _placeholder={{ color: placeholderColor }}
              isDisabled={disabled}
            />
          </Box>

          {/* Second row: File Upload (left) and Send Button (right) */}
          <Box display="flex" justifyContent="space-between" alignItems="center" h="2rem">
            {/* File Upload Button - Bottom Left */}
            {showFileAttachment && (
              <>
                <IconButton
                  aria-label="Attach file"
                  icon={<AttachmentIcon />}
                  size="sm"
                  variant="ghost"
                  borderRadius="full"
                  isDisabled={
                    disabled ||
                    fileUpload.state.files.length >= MAX_FILES ||
                    fileUpload.state.isProcessing
                  }
                  onClick={() => fileInputRef.current?.click()}
                />

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getFileAcceptString()}
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

            {/* Spacer for when file attachment is hidden */}
            {!showFileAttachment && <Box />}

            {/* Send / Refreshing-Stop Button - Bottom Right */}
            {isRefreshing ? (
              <IconButton
                aria-label={isHoveringStreamButton ? 'Stop' : 'Refreshing'}
                icon={
                  isHoveringStreamButton ? (
                    <FaStop />
                  ) : (
                    <RepeatIcon css={{ animation: `${spinAnimation} 1s linear infinite` }} />
                  )
                }
                variant="solid"
                {...(isHoveringStreamButton
                  ? { colorScheme: 'red' as const }
                  : { bg: 'gray.300' as const })}
                size="sm"
                borderRadius="md"
                onClick={handleStop}
                onMouseEnter={() => setIsHoveringStreamButton(true)}
                onMouseLeave={() => setIsHoveringStreamButton(false)}
                cursor="pointer"
              />
            ) : (
              <IconButton
                aria-label="Send message"
                icon={<ArrowUpIcon />}
                {...(canSend ? { colorScheme: 'primary' } : {})}
                size="sm"
                borderRadius="md"
                isDisabled={!canSend}
                onClick={handleSend}
                cursor={canSend ? 'pointer' : 'not-allowed'}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

ChatInputBox.displayName = 'ChatInputBox'

export default ChatInputBox

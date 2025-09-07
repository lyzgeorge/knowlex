import React, { useState, useRef, useCallback } from 'react'
import { Box, IconButton, useColorModeValue, Icon, Text, Tooltip } from '@chakra-ui/react'
import { HiArrowUp, HiPaperClip, HiArrowPath, HiStop } from 'react-icons/hi2'
import { keyframes } from '@emotion/react'
// token formatting removed: display raw token numbers
import { useI18n } from '@renderer/hooks/useI18n'
import {
  useSendMessage,
  useIsSending,
  useIsStreaming,
  useStreamingMessageId,
  useStopStreaming,
  useCurrentConversation,
  useIsReasoningStreaming,
  useReasoningStreamingMessageId
} from '@renderer/stores/conversation/index'
import { useMessageBranching } from '@renderer/hooks/useMessageBranching'
import { TempFileCard, TempFileCardList, AutoResizeTextarea } from '@renderer/components/ui'
import { ReasoningEffortSelector } from '../models/ReasoningEffortSelector'
import { useActiveModelCapabilities } from '@renderer/hooks/useModelCapabilities'
import {
  useFileUpload,
  FileUploadItem,
  ProcessedFile,
  getFileAcceptString
} from '@renderer/hooks/useFileUpload'
import { fromUserInput as buildFromUserInput } from '@shared/message/content-builder'
import { resolveReasoningEffort } from '@shared/reasoning/policy'
import { useRequestTokenCount } from '@renderer/hooks/useRequestTokenCount'
import type { Message, MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'

// Animation for refresh icon
const spinAnimation = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export type ChatInputVariant = 'main-entrance' | 'conversation' | 'project-entrance'

export interface ChatInputBoxProps {
  /** Input variant determines styling and behavior */
  variant?: ChatInputVariant
  /** Optional project context for creating new conversations */
  projectId?: string
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
  projectId,
  disabled = false,
  placeholder,
  showFileAttachment = true,
  className,
  branching
}) => {
  const { t } = useI18n()
  const [input, setInput] = useState('')
  const [isHoveringStreamButton, setIsHoveringStreamButton] = useState(false)
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sendMessage = useSendMessage()
  const isSending = useIsSending()
  const isStreaming = useIsStreaming()
  const streamingMessageId = useStreamingMessageId()
  const stopStreaming = useStopStreaming()
  const isReasoningStreaming = useIsReasoningStreaming()
  const reasoningStreamingMessageId = useReasoningStreamingMessageId()
  const { currentConversation, currentMessages } = useCurrentConversation()
  // Use centralized capability detection
  const { capabilities: activeModelCapabilities, modelConfig: activeModel } =
    useActiveModelCapabilities(currentConversation?.modelConfigId)
  const reasoningSupported = activeModelCapabilities.supportsReasoning

  // Reset reasoning effort when model doesn't support reasoning
  React.useEffect(() => {
    if (!reasoningSupported && reasoningEffort !== undefined) {
      setReasoningEffort(undefined)
    }
  }, [reasoningSupported, reasoningEffort])
  // Resolve branching: always call the hook (hooks must be unconditional)
  const internalBranch = !branching
  const branchingResult = useMessageBranching(currentMessages)
  const filteredMessages = internalBranch
    ? branchingResult.filteredMessages
    : branching!.filteredMessages

  // Use the file upload hook
  const fileUpload = useFileUpload()
  // File constraints (removed MAX_FILES as file count is no longer limited)

  // Convert processed files to token count format with unique IDs
  const tokenCountFiles = fileUpload.state.processedFiles.map((file, index) => ({
    id: `${file.filename}-${file.size}-${index}`, // Create unique ID with filename, size, and index
    name: file.filename,
    type: file.isImage ? ('image' as const) : ('text' as const),
    content: file.content,
    ...(file.isImage && file.content && { dataUrl: file.content })
  }))

  // Token counting hook
  const tokenCount = useRequestTokenCount({
    text: input,
    processedFiles: tokenCountFiles,
    model: activeModel
  })

  // Theme colors
  // call hooks unconditionally to satisfy rules-of-hooks
  const bgColor = useColorModeValue('surface.primary', 'surface.primary')
  const placeholderColor = useColorModeValue('text.tertiary', 'text.tertiary')
  const tokenCountTertiary = useColorModeValue('text.tertiary', 'text.tertiary')
  const tokenCountColor = tokenCount.overLimit ? 'red.500' : tokenCountTertiary

  // token counts displayed as raw numbers

  // Build message content from text and processed files using shared builder
  const buildMessageContent = useCallback(
    (text: string, processedFiles: ProcessedFile[] = []): MessageContent => {
      const files = processedFiles
        .filter((f) => !f.error)
        .map((f) => ({
          filename: f.filename,
          content: f.content || '',
          size: f.size,
          mimeType: f.mimeType,
          isImage: !!f.isImage
        }))
      return buildFromUserInput({ text: text.trim(), files })
    },
    []
  )

  // Get default placeholder based on variant
  const getDefaultPlaceholder = (): string => {
    switch (variant) {
      case 'main-entrance':
        return t('chat.typeMessage')
      case 'project-entrance':
        return t('chat.startConversation')
      case 'conversation':
        return t('chat.typeMessage')
      default:
        return t('chat.typeMessage')
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

      // Determine routing for the message based on variant/context
      const sendOptions: {
        conversationId?: string
        parentMessageId?: string
        projectId?: string
        reasoningEffort?: ReasoningEffort
        modelConfigId?: string
      } = {}

      if (variant === 'project-entrance' && projectId) {
        // Always create a new conversation under this project.
        // Do not thread into any previously selected conversation.
        sendOptions.projectId = projectId
        // Intentionally avoid setting parentMessageId to start a fresh thread
        if (reasoningEffort !== undefined) {
          sendOptions.reasoningEffort = reasoningEffort
        }
      } else if (currentConversation?.id) {
        // Normal behavior: send to currently selected conversation
        sendOptions.conversationId = currentConversation.id
        if (lastAssistantMessage?.id) {
          sendOptions.parentMessageId = lastAssistantMessage.id
        }
        if (reasoningEffort !== undefined) {
          sendOptions.reasoningEffort = reasoningEffort
        }
      } else if (variant === 'main-entrance') {
        // Main entrance: create new conversation with reasoning effort and active model
        if (reasoningEffort !== undefined) {
          sendOptions.reasoningEffort = reasoningEffort
        }
        if (activeModel?.id) {
          sendOptions.modelConfigId = activeModel.id
        }
      }

      // Resolve reasoning effort via strategy before sending
      const resolvedReasoning = resolveReasoningEffort(reasoningEffort, activeModelCapabilities)
      if (resolvedReasoning !== undefined) sendOptions.reasoningEffort = resolvedReasoning

      console.log('handleSend: Sending with options:', sendOptions)

      try {
        // Send message through store - works for both variants
        await sendMessage(content, sendOptions)
      } finally {
        // No cleanup needed for main-entrance variant anymore
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
  }, [
    input,
    fileUpload,
    isSending,
    disabled,
    sendMessage,
    buildMessageContent,
    currentConversation,
    filteredMessages,
    variant,
    projectId,
    reasoningEffort,
    activeModel
  ])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter key sends message for all variants (Shift+Enter for new line)
        // Block during any refreshing state or token limit exceeded
        const isRefreshing = isSending || isStreaming || isReasoningStreaming
        if (isRefreshing || tokenCount.overLimit) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, isSending, isStreaming, isReasoningStreaming, tokenCount.overLimit]
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
  // 5. Not over token limit
  const canSend =
    (hasTextContent || hasSuccessfulFiles) &&
    !disabled &&
    !fileUpload.state.isProcessing &&
    !isRefreshing &&
    !tokenCount.overLimit

  // Unified render - single implementation for all variants
  return (
    <Box
      p={4}
      className={className}
      maxW="780px"
      w="full"
      mx="auto"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Unified Input Area */}
      <Box
        bg={bgColor}
        borderRadius="xl"
        p={3}
        shadow="button-primary"
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
          <Box px="0.5rem" mt="0.25rem" mb="0.5rem">
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

          {/* Second row: File Upload (left), Reasoning Effort (left-center) and Send Button (right) */}
          <Box display="flex" justifyContent="space-between" alignItems="center" h="2rem">
            {/* Left side controls */}
            <Box display="flex" alignItems="center" gap={1}>
              {/* File Upload Button */}
              {showFileAttachment && (
                <>
                  <IconButton
                    aria-label={t('chat.attachFile')}
                    icon={<HiPaperClip />}
                    size="sm"
                    variant="ghost"
                    isDisabled={disabled || fileUpload.state.isProcessing}
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

              {/* Reasoning Effort Selector (icon trigger) */}
              {(variant === 'conversation' || variant === 'main-entrance') && (
                <ReasoningEffortSelector
                  value={reasoningEffort}
                  onChange={setReasoningEffort}
                  variant="icon"
                  isDisabled={!reasoningSupported}
                />
              )}
            </Box>

            {/* Right side controls */}
            <Box display="flex" alignItems="center" gap={2}>
              {/* Token Count Display */}
              {(hasTextContent || hasSuccessfulFiles) && activeModel && (
                <Tooltip
                  label={
                    tokenCount.overLimit
                      ? t('chat.tokenLimitExceeded')
                      : t('chat.tokenCount', {
                          total: tokenCount.total.toLocaleString(),
                          limit: tokenCount.limit.toLocaleString()
                        })
                  }
                  placement="top"
                >
                  <Text
                    fontSize="xs"
                    color={tokenCountColor}
                    fontFamily="mono"
                    minW="fit-content"
                    textAlign="right"
                  >
                    {tokenCount.total.toLocaleString()} / {tokenCount.limit.toLocaleString()}
                  </Text>
                </Tooltip>
              )}

              {/* Send / Refreshing-Stop Button */}
              {isRefreshing ? (
                <IconButton
                  aria-label={isHoveringStreamButton ? t('chat.stop') : t('chat.refreshing')}
                  icon={
                    isHoveringStreamButton ? (
                      <HiStop />
                    ) : (
                      <Icon
                        as={HiArrowPath}
                        css={{ animation: `${spinAnimation} 1s linear infinite` }}
                      />
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
                  aria-label={
                    tokenCount.overLimit ? t('chat.tokenLimitExceeded') : t('chat.sendMessage')
                  }
                  icon={<HiArrowUp />}
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
    </Box>
  )
}

ChatInputBox.displayName = 'ChatInputBox'

export default ChatInputBox

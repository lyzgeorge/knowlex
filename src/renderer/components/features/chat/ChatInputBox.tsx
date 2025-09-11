import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Box, IconButton, Icon, Text, Tooltip } from '@chakra-ui/react'
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

type SendMessageOptions = {
  conversationId?: string
  parentMessageId?: string
  projectId?: string
  modelConfigId?: string
  reasoningEffort?: ReasoningEffort
}

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
  const [showStopIcon, setShowStopIcon] = useState(false)
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
    if (reasoningSupported || reasoningEffort === undefined) return
    setReasoningEffort(undefined)
  }, [reasoningSupported, reasoningEffort])
  // Resolve branching: always call the hook (hooks must be unconditional)
  const branchingResult = useMessageBranching(currentMessages)
  const filteredMessages = branching?.filteredMessages ?? branchingResult.filteredMessages

  // Memoized last assistant message lookup for performance (no array copy)
  const lastAssistantMessage = useMemo(() => {
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      const message = filteredMessages[i]
      if (message?.role === 'assistant') {
        return message
      }
    }
    return undefined
  }, [filteredMessages])

  // Use the file upload hook
  const fileUpload = useFileUpload()
  // File constraints (removed MAX_FILES as file count is no longer limited)

  // Helper to convert processed files to token count format
  const convertFilesForTokenCount = useCallback(
    (processedFiles: ProcessedFile[]) =>
      processedFiles.map((file, index) => ({
        id: `${file.filename}-${file.size}-${index}`,
        name: file.filename,
        type: file.isImage ? ('image' as const) : ('text' as const),
        content: file.content,
        ...(file.isImage && file.content && { dataUrl: file.content })
      })),
    []
  )

  // Token counting hook
  const tokenCount = useRequestTokenCount({
    text: input,
    processedFiles: convertFilesForTokenCount(fileUpload.state.processedFiles),
    model: activeModel
  })

  // Theme colors
  const bgColor = 'surface.primary'
  const tokenCountColor = tokenCount.overLimit ? 'red.500' : 'text.tertiary'

  // token counts displayed as raw numbers

  // Build message content from text and processed files using shared builder
  const buildMessageContent = useCallback(
    (text: string, processedFiles: ProcessedFile[] = []): MessageContent => {
      const validFiles = processedFiles
        .filter((f) => !f.error)
        .map((f) => ({
          filename: f.filename,
          content: f.content || '',
          size: f.size,
          mimeType: f.mimeType,
          isImage: !!f.isImage
        }))
      return buildFromUserInput({ text: text.trim(), files: validFiles })
    },
    []
  )

  // Simplified placeholder logic
  const effectivePlaceholder =
    placeholder ??
    (variant === 'project-entrance' ? t('chat.startConversation') : t('chat.typeMessage'))

  // Handle file upload - simplified since hook handles deduplication
  const handleFileUpload = useCallback(
    (newFiles: FileList) => {
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

  // Helper to build unified send options across variants
  const buildSendOptions = useCallback(
    (modelAtSend: string | undefined) => {
      const sendOptions: SendMessageOptions = {}

      // Route based on variant and context
      if (variant === 'project-entrance' && projectId) {
        // Create new conversation under this project
        sendOptions.projectId = projectId
      } else if (currentConversation?.id) {
        // Send to current conversation
        sendOptions.conversationId = currentConversation.id
        if (lastAssistantMessage?.id) {
          sendOptions.parentMessageId = lastAssistantMessage.id
        }
      }

      // Set model config for new conversations (both project-entrance and main-entrance)
      if (!sendOptions.conversationId && modelAtSend) {
        sendOptions.modelConfigId = modelAtSend
      }

      return sendOptions
    },
    [variant, projectId, currentConversation, lastAssistantMessage]
  )

  // Create single guard for send capability
  const isBusy = isSending || isStreaming || isReasoningStreaming
  const hasTextContent = input.trim().length > 0
  const hasSuccessfulFiles = fileUpload.state.successfulFilesCount > 0
  const canSend =
    (hasTextContent || hasSuccessfulFiles) &&
    !disabled &&
    !fileUpload.state.isProcessing &&
    !isBusy &&
    !tokenCount.overLimit

  // Handle send message - unified logic for both variants
  const handleSend = useCallback(async () => {
    if (!canSend) return

    // Capture model at send time to prevent races
    const modelAtSend = activeModel?.id

    // Store original values for potential error recovery
    const originalInput = input
    const originalFiles = [...fileUpload.state.files]

    try {
      // Process temporary files if any
      let processedFiles: ProcessedFile[] = []
      if (fileUpload.state.files.length > 0) {
        processedFiles = await fileUpload.processFiles()
      }

      // Clear input and files immediately for better UX
      setInput('')
      fileUpload.clearFiles()

      // Build message content using internal utility
      const content = buildMessageContent(input.trim(), processedFiles)

      // Build unified send options (uses memoized lastAssistantMessage)
      const sendOptions = buildSendOptions(modelAtSend)

      // Resolve and apply reasoning effort only once
      const resolvedReasoning = resolveReasoningEffort(reasoningEffort, activeModelCapabilities)
      if (resolvedReasoning !== undefined) {
        sendOptions.reasoningEffort = resolvedReasoning
      }

      // Send message through store
      await sendMessage(content, sendOptions)
    } catch (error) {
      // If error, restore the input and files
      setInput(originalInput)
      // Restore original files
      if (originalFiles.length > 0) {
        // Extract File objects from FileUploadItem
        const filesToRestore = originalFiles.map((item) => item.file)
        fileUpload.addFiles(filesToRestore)
      }
      console.error('Failed to send message:', error)
    }
  }, [
    canSend,
    activeModel,
    input,
    fileUpload,
    buildMessageContent,
    buildSendOptions,
    reasoningEffort,
    activeModelCapabilities,
    sendMessage
  ])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        // Enter key sends message for all variants (Shift+Enter for new line)
        if (!canSend) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, canSend]
  )

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
              _placeholder={{ color: 'text.tertiary' }}
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
              <ReasoningEffortSelector
                value={reasoningEffort}
                onChange={setReasoningEffort}
                variant="icon"
                isDisabled={!reasoningSupported}
              />
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

              {/* Send / Busy-Stop Button */}
              {isBusy ? (
                <IconButton
                  aria-label={showStopIcon ? t('chat.stop') : t('chat.refreshing')}
                  icon={
                    showStopIcon ? (
                      <HiStop />
                    ) : (
                      <Icon
                        as={HiArrowPath}
                        css={{ animation: `${spinAnimation} 1s linear infinite` }}
                      />
                    )
                  }
                  variant="solid"
                  {...(showStopIcon ? { colorScheme: 'red' } : { bg: 'gray.300' })}
                  size="sm"
                  borderRadius="md"
                  onClick={handleStop}
                  onMouseEnter={() => setShowStopIcon(true)}
                  onMouseLeave={() => setShowStopIcon(false)}
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

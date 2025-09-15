/**
 * Unified chat input box component with refactored utilities
 *
 * Features:
 * - Uses unified token counting hook
 * - Uses shared message utilities for content building
 * - Uses reasoning effort hook
 * - Uses shared getLastAssistantMessage utility
 * - Uses optional MessageBranchingContext when available
 */

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Box, IconButton } from '@chakra-ui/react'
import { HiPaperClip } from 'react-icons/hi2'
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
import { useOptionalBranching } from '@renderer/contexts/MessageBranchingContext'
import { AutoResizeTextarea } from '@renderer/components/ui'
import { ReasoningEffortSelector } from '../models/ReasoningEffortSelector'
import { useActiveModelCapabilities } from '@renderer/hooks/useModelCapabilities'
import useFileUpload, { getFileAcceptString } from '@renderer/hooks/useAttachmentUpload'
import { buildUserMessageContent, getLastAssistantMessage } from '@shared/utils/message-utils'
import { useMessageTokenEstimate } from '@renderer/hooks/useMessageTokenEstimate'
import { useReasoningEffort } from '@renderer/hooks/useReasoningEffort'
import { resolveReasoningEffort } from '@shared/reasoning/policy'
import { FileAttachmentList, SendButton, TokenCounter } from '@renderer/components/ui'
import type { Message } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'
import { isNonEmptyString } from '@renderer/utils/validation'

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
 * Unified chat input box component with refactored utilities
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
  // UI state moved into subcomponents
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

  // Use reasoning effort hook
  const { reasoningEffort, setReasoningEffort, reasoningSupported } =
    useReasoningEffort(activeModelCapabilities)

  // Resolve branching with clear precedence order:
  // 1. MessageBranchingContext (when inside provider)
  // 2. branching prop (externally managed)
  // 3. currentMessages (fallback to raw messages)
  const branchingContext = useOptionalBranching()
  const filteredMessages =
    branchingContext?.filteredMessages ?? branching?.filteredMessages ?? currentMessages

  // Use shared utility for last assistant message lookup
  const lastAssistantMessage = useMemo(
    () => getLastAssistantMessage(filteredMessages),
    [filteredMessages]
  )

  // Use the file upload hook
  const fileUpload = useFileUpload()

  // Unified token counting hook
  const tokenCount = useMessageTokenEstimate({
    text: input,
    attachments: fileUpload.state.processedFiles,
    model: activeModel
  })

  // Theme colors
  const bgColor = 'surface.primary'
  const tokenCountColor = tokenCount.overLimit ? 'red.500' : 'text.tertiary'

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
    if (!idToStop) {
      return // Explicit return when no ID to stop
    }

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
  const hasTextContent = isNonEmptyString(input)
  const hasSuccessfulFiles = fileUpload.state.successfulFilesCount > 0
  const canSend =
    (hasTextContent || hasSuccessfulFiles) &&
    !disabled &&
    !fileUpload.state.isProcessing &&
    !isBusy &&
    !tokenCount.overLimit

  // Handle send message - unified logic using shared utilities
  const handleSend = useCallback(async () => {
    if (!canSend) return

    // Capture model at send time to prevent races
    const modelAtSend = activeModel?.id

    // Store original values for potential error recovery
    const originalInput = input
    const originalFiles = [...fileUpload.state.files]

    try {
      // Process attachments if any
      let processedFiles: any[] = []
      if (fileUpload.state.files.length > 0) {
        processedFiles = await fileUpload.processFiles()
      }

      // Clear input and files immediately for better UX
      setInput('')
      fileUpload.clearFiles()

      // Build message content using shared utility
      const content = buildUserMessageContent(
        input.trim(),
        processedFiles.map((f) => ({
          filename: f.filename,
          content: f.content || '',
          size: f.size,
          mimeType: f.mimeType,
          isImage: !!f.isImage
        }))
      )

      // Build unified send options
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
      // Restore original files - avoid duplicate processing by passing File objects directly
      if (originalFiles.length > 0) {
        const filesToRestore = originalFiles.map((item) => item.file)
        // Note: addFiles handles deduplication, so this won't cause duplicate processing
        fileUpload.addFiles(filesToRestore)
      }
      console.error('Failed to send message:', error)
    }
  }, [
    canSend,
    activeModel,
    input,
    fileUpload,
    buildSendOptions,
    reasoningEffort,
    activeModelCapabilities,
    sendMessage
  ])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ignore Enter while IME composition is active. Some IMEs (especially for CJK)
      // use the Enter key to confirm composition; we should not interpret that as
      // a send action. Check both React's isComposing (not always present) and
      // the native event flag `isComposing` for broader compatibility.
      const native = (e as any).nativeEvent as { isComposing?: boolean }
      const isComposing = (e as any).isComposing || native?.isComposing

      if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
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
          <FileAttachmentList
            items={fileUpload.state.files.map((fi: any) => ({
              id: fi.id,
              file: fi.file,
              filename: fi.file.name,
              size: fi.file.size,
              mimeType: fi.file.type
            }))}
            onRemove={(id) => {
              const target = fileUpload.state.files.find((f: any) => f.id === id)
              if (target) fileUpload.removeFile(target.file)
            }}
          />
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
                <TokenCounter
                  visible={true}
                  total={tokenCount.total}
                  limit={tokenCount.limit}
                  overLimit={tokenCount.overLimit}
                  label={
                    tokenCount.overLimit
                      ? t('chat.tokenLimitExceeded')
                      : t('chat.tokenCount', {
                          total: tokenCount.total.toLocaleString(),
                          limit: tokenCount.limit.toLocaleString()
                        })
                  }
                  color={tokenCountColor}
                />
              )}

              {/* Send / Busy-Stop Button */}
              <SendButton
                isBusy={isBusy}
                canSend={canSend}
                onSend={handleSend}
                onStop={handleStop}
                stopLabel={t('chat.stop')}
                sendingLabel={t('chat.refreshing')}
                sendLabel={t('chat.sendMessage')}
                overLimit={tokenCount.overLimit}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

ChatInputBox.displayName = 'ChatInputBox'

export default ChatInputBox

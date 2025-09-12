/**
 * User message component with editing and branching support
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Box, VStack, HStack, useColorModeValue, IconButton, Text, Icon } from '@chakra-ui/react'
import {
  HiPencil,
  HiClipboard,
  HiPaperClip,
  HiArrowUp,
  HiXMark,
  HiChevronLeft,
  HiChevronRight,
  HiLightBulb
} from 'react-icons/hi2'
import type { Message } from '@shared/types/message'
import { createUserMessageViewModel } from '@shared/utils/message-view-models'
import { MarkdownContent } from '@renderer/utils/markdownComponents'
import { toMessageFileLikeFromMessagePart } from '@renderer/components/ui/TempFileCard'
import AutoResizeTextarea from '@renderer/components/ui/AutoResizeTextarea'
import { useIsSending, useCurrentConversation } from '@renderer/stores/conversation/index'
import { useMessageActions } from '@renderer/hooks/useMessageActions'
import { getFileAcceptString } from '@renderer/hooks/useFileUpload'
import { useMessageTokenEstimate } from '@renderer/hooks/useMessageTokenEstimate'
import { useActiveModelCapabilities } from '@renderer/hooks/useModelCapabilities'
import {
  useMessageBranchInfo,
  useMessageBranchChange
} from '@renderer/contexts/MessageBranchingContext'
import { useI18n } from '@renderer/hooks/useI18n'
import { TokenCounter, FileAttachmentList } from '@renderer/components/ui'

export interface UserMessageProps {
  /** Message data */
  message: Message
  /** Whether to show the timestamp */
  showTimestamp?: boolean
}

/**
 * User message component - right-aligned bubble with centralized branching
 */
export const UserMessage: React.FC<UserMessageProps> = ({ message, showTimestamp = true }) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const { t } = useI18n()
  const isSending = useIsSending()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Unified message actions with editing callbacks
  const messageActions = useMessageActions({
    onEditStart: () => setIsEditing(true),
    onEditCancel: () => setIsEditing(false),
    onEditSent: () => setIsEditing(false)
  })

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userTextColor = useColorModeValue('text.primary', 'text.primary')

  // Use branching context instead of props
  const branchInfo = useMessageBranchInfo(message)
  const onBranchChange = useMessageBranchChange(message)

  // Branch management from context
  const branches = branchInfo?.branches || [message]
  const activeIndex = branchInfo?.currentIndex || 0
  const currentBranch = branches[activeIndex] || message
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < branches.length - 1
  const goToPrevious = useCallback(() => {
    const newIndex = Math.max(0, activeIndex - 1)
    onBranchChange(newIndex)
  }, [activeIndex, onBranchChange])
  const goToNext = useCallback(() => {
    const newIndex = Math.min(branches.length - 1, activeIndex + 1)
    onBranchChange(newIndex)
  }, [activeIndex, branches.length, onBranchChange])

  // Create normalized view model
  const viewModel = createUserMessageViewModel(currentBranch)

  // Get conversation and model context
  const { currentConversation } = useCurrentConversation()
  const { modelConfig: activeModel } = useActiveModelCapabilities(
    currentConversation?.modelConfigId
  )

  // Unified token counting with new hook
  const tokenCount = useMessageTokenEstimate({
    text: isEditing ? messageActions.editableMessage.draftText : '',
    attachments: isEditing ? messageActions.editableMessage.attachments : [],
    model: activeModel
  })

  // Token count styling (simplified)
  const tokenCountColor = tokenCount.overLimit ? 'red.500' : 'text.tertiary'

  // Initialize draft only when entering edit mode OR branch identity changes.
  // Avoid depending on entire editableMessage object (unstable) to prevent re-init each render.
  const initializeEditable = messageActions.editableMessage.initialize
  useEffect(() => {
    if (isEditing) {
      initializeEditable(currentBranch)
    }
  }, [isEditing, currentBranch.id, initializeEditable])

  // Separate effect for auto-focus to avoid infinite loop
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
        // Set cursor at end of text
        const length = textareaRef.current?.value.length || 0
        textareaRef.current?.setSelectionRange(length, length)
      }, 0)
    }
  }, [isEditing])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // Handle edit message using unified actions
  const handleEdit = useCallback(() => {
    messageActions.edit(currentBranch)
  }, [messageActions, currentBranch])

  // Handle cancel editing using unified actions
  const handleCancelEdit = useCallback(() => {
    messageActions.cancelEdit()
  }, [messageActions])

  // Handle send edited message using unified actions
  const handleSendEdit = useCallback(async () => {
    if (!messageActions.canSendEdited() || isSending) return
    await messageActions.sendEdited(currentBranch)
  }, [isSending, messageActions, currentBranch])

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList) => {
      messageActions.editableMessage.addFiles(files)
    },
    [messageActions.editableMessage]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelEdit()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        // Block if over token limit
        if (tokenCount.overLimit) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        handleSendEdit()
      }
    },
    [handleCancelEdit, handleSendEdit, tokenCount.overLimit]
  )

  // Handle copy using unified actions
  const handleCopy = useCallback(async () => {
    await messageActions.copy(currentBranch)
  }, [currentBranch, messageActions])

  // Determine if send button should be enabled
  const canSend =
    messageActions.canSendEdited() &&
    !isSending &&
    !messageActions.editableMessage.isProcessing &&
    !tokenCount.overLimit

  return (
    <HStack align="flex-start" spacing={2} width="100%" justify="flex-end" mb={2}>
      <VStack align="stretch" spacing={2} flex={1} width="100%" maxWidth="70%">
        {/* File parts - render first with horizontal layout */}
        {isEditing
          ? /* EDITING MODE - Attachments */
            messageActions.editableMessage.attachments.length > 0 && (
              <FileAttachmentList
                items={messageActions.editableMessage.attachments.map((att) => ({
                  id: att.id,
                  filename: att.filename,
                  size: att.size || 0,
                  mimeType: att.mimeType
                }))}
                onRemove={(id) => messageActions.editableMessage.removeAttachment(id)}
                alignSelf="flex-end"
                maxW="100%"
              />
            )
          : /* NORMAL VIEW MODE - File parts using view model */
            viewModel.hasFiles && (
              <FileAttachmentList
                items={
                  viewModel.fileParts
                    .map((part, index: number) => {
                      const file = toMessageFileLikeFromMessagePart(part)
                      return file
                        ? {
                            id: `filepart-${index}`,
                            filename: file.filename,
                            size: file.size,
                            mimeType: file.mimeType
                          }
                        : null
                    })
                    .filter(Boolean) as Array<{
                    id: string
                    filename: string
                    size: number
                    mimeType: string
                  }>
                }
                onRemove={() => {}}
                alignSelf="flex-end"
                maxW="100%"
              />
            )}

        {/* Text content bubble - editable or normal */}
        {(isEditing || viewModel.hasText) && (
          <Box
            bg={userBg}
            color={userTextColor}
            px={3}
            py={2}
            borderRadius="lg"
            maxWidth="100%"
            {...(isEditing ? { w: '100%' } : { w: 'fit-content', ml: 'auto' })}
          >
            {isEditing ? (
              <>
                {/* Text Editor */}
                <AutoResizeTextarea
                  ref={textareaRef}
                  value={messageActions.editableMessage.draftText}
                  onChange={(e) => messageActions.editableMessage.setDraftText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Edit your message..."
                  maxRows={3}
                  fontSize="sm"
                  lineHeight="1.6"
                  width="100%"
                  _placeholder={{ color: 'text.tertiary' }}
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
            ) : (
              <>
                <MarkdownContent text={viewModel.textContent} />
                {/* Reasoning badge: show transient per-message reasoning selection if available */}
                {viewModel.reasoningEffort && (
                  <HStack spacing={1} justify="flex-end" mt={1} color="gray.500">
                    <Icon as={HiLightBulb} boxSize={3} />
                    <Text fontSize="xs">Reasoning: {viewModel.reasoningEffort}</Text>
                  </HStack>
                )}
              </>
            )}
          </Box>
        )}

        {/* Action bar */}
        {isEditing ? (
          /* Editing mode actions */
          <HStack spacing={1} alignSelf="flex-end">
            {/* File Upload Button */}
            <IconButton
              aria-label={t('chat.attachFile')}
              icon={<HiPaperClip />}
              size="xs"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              isDisabled={messageActions.editableMessage.isProcessing || isSending}
              _hover={{ bg: 'surface.hover' }}
            />

            {/* Token Count Display */}
            {(messageActions.editableMessage.draftText.trim() ||
              messageActions.editableMessage.attachments.length > 0) &&
              activeModel && (
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

            {/* Cancel Button */}
            <IconButton
              aria-label={t('chat.cancelEdit')}
              icon={<HiXMark />}
              size="xs"
              variant="ghost"
              onClick={handleCancelEdit}
              _hover={{ bg: 'surface.hover' }}
            />
            {/* Send Button */}
            <IconButton
              aria-label={
                tokenCount.overLimit ? t('chat.tokenLimitExceeded') : t('chat.sendMessage')
              }
              icon={<HiArrowUp />}
              size="xs"
              variant="ghost"
              onClick={handleSendEdit}
              isDisabled={!canSend}
              _hover={{ bg: 'surface.hover' }}
            />
          </HStack>
        ) : (
          /* Normal mode actions */
          <HStack
            spacing={2}
            px={1}
            minHeight="16px"
            alignItems="center"
            alignSelf="flex-end"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Box display={isHovered ? 'flex' : 'none'}>
              <HStack spacing={0}>
                {/* Edit */}
                <IconButton
                  aria-label={t('chat.editMessage')}
                  icon={<HiPencil />}
                  size="xs"
                  variant="ghost"
                  onClick={handleEdit}
                  _hover={{ bg: 'surface.hover' }}
                />
                {/* Copy */}
                <IconButton
                  aria-label={t('chat.copyToClipboard')}
                  icon={<HiClipboard />}
                  size="xs"
                  variant="ghost"
                  onClick={handleCopy}
                  _hover={{ bg: 'surface.hover' }}
                />
              </HStack>
            </Box>
            <Box display={!isHovered && showTimestamp ? 'block' : 'none'}>
              <Text variant="timestamp">{viewModel.formattedTimestamp}</Text>
            </Box>
            {/* Branch Switcher - always show when multiple branches exist */}
            {branches.length > 1 && (
              <HStack spacing={1} fontSize="xs" color="text.secondary" align="center">
                <Icon
                  as={HiChevronLeft}
                  boxSize={3}
                  cursor="pointer"
                  _hover={{ color: 'text.primary' }}
                  onClick={goToPrevious}
                  opacity={canGoPrevious ? 1 : 0.5}
                />
                <Text lineHeight="1">{activeIndex + 1}</Text>
                <Text lineHeight="1">/</Text>
                <Text lineHeight="1">{branches.length}</Text>
                <Icon
                  as={HiChevronRight}
                  boxSize={3}
                  cursor="pointer"
                  _hover={{ color: 'text.primary' }}
                  onClick={goToNext}
                  opacity={canGoNext ? 1 : 0.5}
                />
              </HStack>
            )}
          </HStack>
        )}
      </VStack>
    </HStack>
  )
}

UserMessage.displayName = 'UserMessage'

export default UserMessage

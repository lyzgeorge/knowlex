import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
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
import type { Message, MessageContentPart } from '@shared/types/message'
import { formatTime } from '@shared/utils/time'
import { buildUserMessageBranchSendOptions } from '@shared/utils/message-branching'
import MarkdownContent from '@renderer/components/ui/MarkdownContent'
import {
  TempFileCard,
  toMessageFileLikeFromMessagePart,
  TempFileCardList
} from '@renderer/components/ui/TempFileCard'
import AutoResizeTextarea from '@renderer/components/ui/AutoResizeTextarea'
import { useNotifications } from '@renderer/components/ui'
import { useSendMessage, useIsSending } from '@renderer/stores/conversation'
// Inline branch navigation logic; remove dependency on useMessageBranch hook
import { useEditableMessage } from '@renderer/hooks/useEditableMessage'
import { useMessageContentDiff } from '@renderer/hooks/useMessageContentDiff'
import { getFileAcceptString } from '@renderer/hooks/useFileUpload'

export interface BranchInfo {
  branches: Message[]
  currentIndex: number
  totalCount: number
}

export interface UserMessageProps {
  /** Message data */
  message: Message
  /** Whether to show the timestamp */
  showTimestamp?: boolean
  /** Branch information for this message */
  branchInfo?: BranchInfo
  /** Callback when branch is changed */
  onBranchChange?: (index: number) => void
}

/**
 * User message component - right-aligned bubble
 */
export const UserMessage: React.FC<UserMessageProps> = ({
  message,
  showTimestamp = true,
  branchInfo,
  onBranchChange
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const notifications = useNotifications()
  const sendMessage = useSendMessage()
  const isSending = useIsSending()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userTextColor = useColorModeValue('text.primary', 'text.primary')

  // Branch management (inline replacement of useMessageBranch)
  const branches = branchInfo?.branches || [message]
  const activeIndex = branchInfo?.currentIndex || 0
  const currentBranch = branches[activeIndex] || message
  const canGoPrevious = activeIndex > 0
  const canGoNext = activeIndex < branches.length - 1
  const goToPrevious = useCallback(() => {
    const newIndex = Math.max(0, activeIndex - 1)
    onBranchChange?.(newIndex)
  }, [activeIndex, onBranchChange])
  const goToNext = useCallback(() => {
    const newIndex = Math.min(branches.length - 1, activeIndex + 1)
    onBranchChange?.(newIndex)
  }, [activeIndex, branches.length, onBranchChange])

  // Editable message state
  const editableMessage = useEditableMessage()

  // Content diffing
  const contentDiff = useMessageContentDiff(currentBranch.content)

  // Initialize editing state when entering edit mode or switching branch while editing
  useEffect(() => {
    if (isEditing) {
      editableMessage.initialize(currentBranch)
    }
  }, [isEditing, currentBranch.id, activeIndex, editableMessage.initialize])

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

  // Check if content has changed
  const hasContentChanged = useCallback((): boolean => {
    const newContent = editableMessage.buildContent()
    return contentDiff.compare(newContent)
  }, [editableMessage.buildContent, contentDiff.compare])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // Derived values
  const fileParts = useMemo(() => {
    return currentBranch.content.filter(
      (part) => part.type === 'temporary-file' || part.type === 'image'
    )
  }, [currentBranch.content])

  const textParts = useMemo(() => {
    return currentBranch.content.filter((part) => part.type === 'text')
  }, [currentBranch.content])

  const textContent = useMemo(() => {
    return textParts.map((part) => part.text || '').join('\n')
  }, [textParts])

  // Handle edit message
  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  // Handle cancel editing
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    editableMessage.reset()
  }, [editableMessage.reset])

  // Handle send edited message
  const handleSendEdit = useCallback(async () => {
    if (!editableMessage.isValid() || !hasContentChanged() || isSending) {
      return
    }

    try {
      const content = editableMessage.buildContent()
      const sendOptions = buildUserMessageBranchSendOptions(currentBranch)

      await sendMessage(content, sendOptions)

      // Exit editing mode
      setIsEditing(false)
      editableMessage.reset()

      // Note: New branch auto-switch handled by the message branching hook
    } catch (error) {
      console.error('Failed to send edited message:', error)
      notifications.error({
        title: 'Send failed',
        description: 'Failed to send edited message',
        duration: 3000
      })
    }
  }, [
    editableMessage.isValid,
    editableMessage.buildContent,
    editableMessage.reset,
    hasContentChanged,
    isSending,
    sendMessage,
    currentBranch,
    notifications
  ])

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList) => {
      editableMessage.addFiles(files)
    },
    [editableMessage.addFiles]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelEdit()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSendEdit()
      }
    },
    [handleCancelEdit, handleSendEdit]
  )

  // Handle copy
  const handleCopy = useCallback(async () => {
    try {
      // Copy visible text from the currently selected branch
      const content = currentBranch.content
        .filter((part) => part.type === 'text')
        .map((part) => part.text || '')
        .join('\n')
      await navigator.clipboard.writeText(content)
      notifications.success({
        title: 'Copied',
        description: 'Text content copied to clipboard',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      notifications.error({
        title: 'Copy failed',
        description: 'Failed to copy',
        duration: 3000
      })
    }
  }, [currentBranch.content, notifications])

  // Determine if send button should be enabled
  const canSend =
    editableMessage.isValid() && hasContentChanged() && !isSending && !editableMessage.isProcessing

  return (
    <HStack align="flex-start" spacing={2} width="100%" justify="flex-end" mb={2}>
      <VStack align="stretch" spacing={2} flex={1} width="100%" maxWidth="70%">
        {/* File parts - render first with horizontal layout */}
        {isEditing
          ? /* EDITING MODE - Attachments */
            editableMessage.attachments.length > 0 && (
              <TempFileCardList alignSelf="flex-end" maxW="100%">
                {editableMessage.attachments.map((attachment) => {
                  if (attachment.kind === 'existing' && attachment.originalPart) {
                    const messageFile = toMessageFileLikeFromMessagePart(attachment.originalPart)
                    return messageFile ? (
                      <TempFileCard
                        key={attachment.id}
                        variant="compact"
                        messageFile={messageFile}
                        onRemove={() => editableMessage.removeAttachment(attachment.id)}
                      />
                    ) : null
                  }

                  // For new attachments, create a messageFile object with actual size
                  const messageFile = {
                    filename: attachment.filename,
                    size: attachment.size || 0,
                    mimeType: attachment.mimeType
                  }
                  return (
                    <TempFileCard
                      key={attachment.id}
                      messageFile={messageFile}
                      onRemove={() => editableMessage.removeAttachment(attachment.id)}
                      variant="compact"
                    />
                  )
                })}
              </TempFileCardList>
            )
          : /* NORMAL VIEW MODE - File parts */
            fileParts.length > 0 && (
              <TempFileCardList alignSelf="flex-end" maxW="100%">
                {fileParts.map((part: MessageContentPart, index: number) => {
                  const messageFile = toMessageFileLikeFromMessagePart(part)
                  return messageFile ? (
                    <TempFileCard
                      key={`filepart-${index}`}
                      variant="compact"
                      messageFile={messageFile}
                    />
                  ) : null
                })}
              </TempFileCardList>
            )}

        {/* Text content bubble - editable or normal */}
        {(isEditing || textContent.trim()) && (
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
                  value={editableMessage.draftText}
                  onChange={(e) => editableMessage.setDraftText(e.target.value)}
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
                <MarkdownContent text={textContent} />
                {/* Reasoning badge: show transient per-message reasoning selection if available */}
                {currentBranch?.reasoningEffort && (
                  <HStack spacing={1} justify="flex-end" mt={1} color="gray.500">
                    <Icon as={HiLightBulb} boxSize={3} />
                    <Text fontSize="xs">Reasoning: {currentBranch.reasoningEffort}</Text>
                  </HStack>
                )}
              </>
            )}
          </Box>
        )}

        {/* Action bar */}
        {isEditing ? (
          /* Editing mode actions */
          <HStack spacing={0} alignSelf="flex-end">
            {/* File Upload Button */}
            <IconButton
              aria-label="Attach file"
              icon={<HiPaperClip />}
              size="xs"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              isDisabled={editableMessage.isProcessing || isSending}
              _hover={{ bg: 'surface.hover' }}
            />
            {/* Cancel Button */}
            <IconButton
              aria-label="Cancel editing"
              icon={<HiXMark />}
              size="xs"
              variant="ghost"
              onClick={handleCancelEdit}
              _hover={{ bg: 'surface.hover' }}
            />
            {/* Send Button */}
            <IconButton
              aria-label="Send message"
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
                  aria-label="Edit message"
                  icon={<HiPencil />}
                  size="xs"
                  variant="ghost"
                  onClick={handleEdit}
                  _hover={{ bg: 'surface.hover' }}
                />
                {/* Copy */}
                <IconButton
                  aria-label="Copy to clipboard"
                  icon={<HiClipboard />}
                  size="xs"
                  variant="ghost"
                  onClick={handleCopy}
                  _hover={{ bg: 'surface.hover' }}
                />
              </HStack>
            </Box>
            <Box display={!isHovered && showTimestamp ? 'block' : 'none'}>
              <Text variant="timestamp">{formatTime(currentBranch.updatedAt)}</Text>
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

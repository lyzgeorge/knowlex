import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue, IconButton } from '@chakra-ui/react'
import {
  EditIcon,
  CopyIcon,
  AttachmentIcon,
  ArrowUpIcon,
  CloseIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@chakra-ui/icons'
import type { Message, MessageContentPart, MessageContent } from '../../../../shared/types/message'
import { formatTime } from '../../../../shared/utils/time'
import MarkdownContent from './MarkdownContent'
import TempFileCard from './TempFileCard'
import AutoResizeTextarea from './AutoResizeTextarea'
import { useNotifications } from './index'
import { useSendMessage, useIsSending } from '../../stores/conversation'
import { useFileUpload, ProcessedFile, getFileAcceptString } from '../../hooks/useFileUpload'

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
  const [draftText, setDraftText] = useState('')
  const [existingAttachments, setExistingAttachments] = useState<MessageContentPart[]>([])

  const notifications = useNotifications()
  const sendMessage = useSendMessage()
  const isSending = useIsSending()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileUpload = useFileUpload()

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userTextColor = useColorModeValue('text.primary', 'text.primary')

  // Use branch info from props or fall back to single message
  const branches = branchInfo?.branches || [message]
  const activeBranchIndex = branchInfo?.currentIndex || 0
  const currentBranch = branches[activeBranchIndex] || message
  const showBranchSwitcher = branches.length > 1

  // Initialize editing state when entering edit mode or switching branch while editing
  useEffect(() => {
    if (!isEditing) return

    // Extract text content from the current branch
    const textContent = currentBranch.content
      .filter((part: MessageContentPart) => part.type === 'text')
      .map((part: MessageContentPart) => part.text || '')
      .join('\n')
    setDraftText(textContent)

    // Extract existing attachments
    const attachments = currentBranch.content.filter(
      (part: MessageContentPart) => part.type === 'temporary-file' || part.type === 'image'
    )
    setExistingAttachments(attachments)

    // Clear file upload state for new attachments
    fileUpload.clearFiles()
  }, [isEditing, currentBranch.id])

  // Build message content from draft and attachments
  const buildMessageContent = useCallback((): MessageContent => {
    const content: MessageContent = []

    // Add text content if present
    const trimmedText = draftText.trim()
    if (trimmedText) {
      content.push({
        type: 'text',
        text: trimmedText
      })
    }

    // Add existing attachments that weren't removed
    existingAttachments.forEach((attachment) => {
      content.push(attachment)
    })

    // Add new attachments from useFileUpload
    const processedFiles = fileUpload.state.processedFiles
    processedFiles.forEach((file: ProcessedFile) => {
      if (file.error) return

      if (file.isImage) {
        content.push({
          type: 'image',
          image: {
            image: file.content,
            mediaType: file.mimeType,
            filename: file.filename
          }
        })
      } else {
        content.push({
          type: 'temporary-file',
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
  }, [draftText, existingAttachments, fileUpload.state.processedFiles])

  // Check if content has changed
  const hasContentChanged = useCallback((): boolean => {
    const newContent = buildMessageContent()
    const originalContent = currentBranch.content

    // Simple comparison - could be more sophisticated
    return JSON.stringify(newContent) !== JSON.stringify(originalContent)
  }, [buildMessageContent, currentBranch.content])

  // Check if content is valid for sending
  const isContentValid = useCallback((): boolean => {
    const content = buildMessageContent()
    return content.some(
      (part) =>
        (part.type === 'text' && part.text?.trim()) ||
        (part.type === 'temporary-file' && part.temporaryFile) ||
        (part.type === 'image' && part.image)
    )
  }, [buildMessageContent])

  const handleMouseEnter = useCallback(() => {
    setIsHovered((prev) => (prev ? prev : true))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered((prev) => (prev ? false : prev))
  }, [])

  // (copy uses currentBranch directly)

  // Render file content part (temporary files and images)
  const renderFileContent = (part: MessageContentPart, index: number) => {
    if (part.type === 'temporary-file' && part.temporaryFile) {
      return (
        <TempFileCard
          key={`file-${index}`}
          variant="compact"
          messageFile={{
            filename: part.temporaryFile.filename,
            size: part.temporaryFile.size,
            mimeType: part.temporaryFile.mimeType
          }}
        />
      )
    }

    if (part.type === 'image' && part.image) {
      // Use stored filename or extract from data URL or use default
      const getImageFilename = (imageContent: any, mediaType?: string): string => {
        // Use stored filename if available
        if (imageContent.filename) {
          return imageContent.filename
        }

        if (typeof imageContent.image === 'string' && imageContent.image.startsWith('data:')) {
          const ext = mediaType?.split('/')[1] || 'png'
          return `image.${ext}`
        }
        return 'Image'
      }

      // Calculate approximate size
      const getApproximateSize = (imageData: any): number => {
        if (typeof imageData === 'string') {
          if (imageData.startsWith('data:')) {
            const base64Data = imageData.split(',')[1] || ''
            return Math.round((base64Data.length * 3) / 4)
          }
          return 0
        }
        return 0
      }

      const filename = getImageFilename(part.image, part.image.mediaType)
      const approximateSize = getApproximateSize(part.image.image)

      return (
        <TempFileCard
          key={`image-${index}`}
          variant="compact"
          messageFile={{
            filename,
            size: approximateSize,
            mimeType: part.image.mediaType || 'image/*'
          }}
        />
      )
    }

    return null
  }

  // Get file parts and text parts from the active branch
  const fileParts = currentBranch.content.filter(
    (part: MessageContentPart) => part.type === 'temporary-file' || part.type === 'image'
  )
  const textParts = currentBranch.content.filter((part: MessageContentPart) => part.type === 'text')
  const textContent = textParts.map((part: MessageContentPart) => part.text || '').join('\n')

  // Handle edit message
  const handleEdit = useCallback(() => {
    setIsEditing(true)
  }, [])

  // Handle cancel editing
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setDraftText('')
    setExistingAttachments([])
    fileUpload.clearFiles()
  }, [fileUpload])

  // Handle send edited message
  const handleSendEdit = useCallback(async () => {
    if (!isContentValid() || !hasContentChanged() || isSending) {
      return
    }

    try {
      const content = buildMessageContent()

      // 分支父节点逻辑修正：
      //  - 如果当前用户消息有 parentMessageId（其父是一个 assistant 消息），则新分支应继续以那个父 assistant 为 parent（兄弟分支）
      //  - 如果当前用户消息是顶层(root，parentMessageId === null)，则新分支应成为新的顶层用户消息（不传 parentMessageId）
      const parentIdForNewBranch = currentBranch.parentMessageId || undefined

      await sendMessage(content, {
        conversationId: currentBranch.conversationId,
        ...(parentIdForNewBranch ? { parentMessageId: parentIdForNewBranch } : {})
      })

      // Exit editing mode
      setIsEditing(false)
      setDraftText('')
      setExistingAttachments([])
      fileUpload.clearFiles()

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
    isContentValid,
    hasContentChanged,
    isSending,
    buildMessageContent,
    sendMessage,
    currentBranch.conversationId,
    currentBranch.parentMessageId,
    currentBranch.id,
    fileUpload,
    notifications
  ])

  // Handle removing existing attachment
  const handleRemoveExistingAttachment = useCallback((index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList) => {
      fileUpload.addFiles(files)
    },
    [fileUpload]
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

  // Handle branch switching
  const handlePreviousBranch = useCallback(() => {
    const newIndex = Math.max(0, activeBranchIndex - 1)
    onBranchChange?.(newIndex)
  }, [activeBranchIndex, onBranchChange])

  const handleNextBranch = useCallback(() => {
    const newIndex = Math.min(branches.length - 1, activeBranchIndex + 1)
    onBranchChange?.(newIndex)
  }, [activeBranchIndex, branches.length, onBranchChange])

  // Handle copy
  const handleCopy = async () => {
    try {
      // Copy visible text from the currently selected branch
      const content = currentBranch.content
        .filter((part: MessageContentPart) => part.type === 'text')
        .map((part: MessageContentPart) => part.text || '')
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
  }

  // Determine if send button should be enabled
  const canSend =
    isContentValid() && hasContentChanged() && !isSending && !fileUpload.state.isProcessing

  return (
    <HStack align="flex-start" spacing={2} width="100%" justify="flex-end" mb={2}>
      <VStack
        align="stretch"
        spacing={2}
        flex={1}
        width="100%"
        maxWidth={isEditing ? '70%' : '70%'}
      >
        {/* File parts - render first with horizontal layout */}
        {isEditing
          ? /* EDITING MODE - Existing Attachments */
            (existingAttachments.length > 0 || fileUpload.state.files.length > 0) && (
              <Box alignSelf="flex-end" mb={1} maxWidth="100%">
                <HStack
                  spacing={2}
                  overflowX="auto"
                  maxWidth="100%"
                  sx={{
                    '&::-webkit-scrollbar': {
                      height: '4px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {existingAttachments.map((attachment, index) => {
                    let messageFile
                    if (attachment.type === 'temporary-file' && attachment.temporaryFile) {
                      messageFile = {
                        filename: attachment.temporaryFile.filename,
                        size: attachment.temporaryFile.size,
                        mimeType: attachment.temporaryFile.mimeType
                      }
                    } else if (attachment.type === 'image' && attachment.image) {
                      // Use stored filename or default
                      const originalFilename = attachment.image.filename || 'Image'
                      // Calculate approximate size from base64 data
                      let approximateSize = 0
                      if (typeof attachment.image.image === 'string') {
                        if (attachment.image.image.startsWith('data:')) {
                          const base64Data = attachment.image.image.split(',')[1] || ''
                          approximateSize = Math.round((base64Data.length * 3) / 4)
                        }
                      }
                      messageFile = {
                        filename: originalFilename,
                        size: approximateSize,
                        mimeType: attachment.image.mediaType || 'image/*'
                      }
                    }

                    return messageFile ? (
                      <TempFileCard
                        key={`existing-${index}`}
                        variant="compact"
                        messageFile={messageFile}
                        onRemove={() => handleRemoveExistingAttachment(index)}
                      />
                    ) : null
                  })}

                  {/* New Attachments from useFileUpload */}
                  {fileUpload.state.files.map((fileItem) => (
                    <TempFileCard
                      key={fileItem.id}
                      file={fileItem.file}
                      onRemove={() => fileUpload.removeFile(fileItem.file)}
                      variant="compact"
                    />
                  ))}
                </HStack>
              </Box>
            )
          : /* NORMAL VIEW MODE - File parts */
            fileParts.length > 0 && (
              <Box alignSelf="flex-end" mb={1} maxWidth="100%">
                <HStack
                  spacing={2}
                  overflowX="auto"
                  maxWidth="100%"
                  sx={{
                    '&::-webkit-scrollbar': {
                      height: '4px'
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'transparent'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '2px'
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: 'rgba(255, 255, 255, 0.3)'
                    }
                  }}
                >
                  {fileParts.map((part: MessageContentPart, index: number) =>
                    renderFileContent(part, index)
                  )}
                </HStack>
              </Box>
            )}

        {/* Text content bubble - editable or normal */}
        {(isEditing || textContent.trim()) && (
          <Box
            bg={userBg}
            color={userTextColor}
            px={3}
            py={2}
            borderRadius="lg"
            border="1px solid"
            borderColor="rgba(74, 124, 74, 0.2)"
            maxWidth="100%"
            {...(isEditing ? { w: '100%' } : { w: 'fit-content', ml: 'auto' })}
          >
            {isEditing ? (
              <>
                {/* Text Editor */}
                <AutoResizeTextarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
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
              <MarkdownContent text={textContent} />
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
              icon={<AttachmentIcon />}
              size="xs"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              isDisabled={fileUpload.state.isProcessing || isSending}
              _hover={{ bg: 'surface.hover' }}
            />
            {/* Cancel Button */}
            <IconButton
              aria-label="Cancel editing"
              icon={<CloseIcon />}
              size="xs"
              variant="ghost"
              onClick={handleCancelEdit}
              _hover={{ bg: 'surface.hover' }}
            />
            {/* Send Button */}
            <IconButton
              aria-label="Send message"
              icon={<ArrowUpIcon />}
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
                  icon={<EditIcon />}
                  size="xs"
                  variant="ghost"
                  onClick={handleEdit}
                  _hover={{ bg: 'surface.hover' }}
                />
                {/* Copy */}
                <IconButton
                  aria-label="Copy to clipboard"
                  icon={<CopyIcon />}
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
            {showBranchSwitcher && (
              <HStack spacing={1} fontSize="xs" color="text.secondary" align="center">
                <ChevronLeftIcon
                  boxSize={3}
                  cursor="pointer"
                  _hover={{ color: 'text.primary' }}
                  onClick={handlePreviousBranch}
                  opacity={activeBranchIndex > 0 ? 1 : 0.5}
                />
                <Text lineHeight="1">{activeBranchIndex + 1}</Text>
                <Text lineHeight="1">/</Text>
                <Text lineHeight="1">{branches.length}</Text>
                <ChevronRightIcon
                  boxSize={3}
                  cursor="pointer"
                  _hover={{ color: 'text.primary' }}
                  onClick={handleNextBranch}
                  opacity={activeBranchIndex < branches.length - 1 ? 1 : 0.5}
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

import React, { useState, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  useColorModeValue,
  IconButton,
  useDisclosure
} from '@chakra-ui/react'
import { EditIcon, CopyIcon } from '@chakra-ui/icons'
import type { Message, MessageContentPart } from '../../../../shared/types/message'
import { formatTime } from '../../../../shared/utils/time'
import MarkdownContent from './MarkdownContent'
import TempFileCard from '../features/chat/TempFileCard'
import MessageEditModal from '../features/chat/MessageEditModal'
import { useNotifications } from './index'

export interface UserMessageProps {
  /** Message data */
  message: Message
  /** Whether to show the timestamp */
  showTimestamp?: boolean
}

/**
 * User message component - right-aligned bubble
 */
export const UserMessage: React.FC<UserMessageProps> = ({ message, showTimestamp = true }) => {
  const [isHovered, setIsHovered] = useState(false)
  const notifications = useNotifications()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userTextColor = useColorModeValue('text.primary', 'text.primary')

  const handleMouseEnter = useCallback(() => {
    setIsHovered((prev) => (prev ? prev : true))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered((prev) => (prev ? false : prev))
  }, [])

  // Get text content only
  const getTextContent = () => {
    return message.content
      .filter((part: MessageContentPart) => part.type === 'text')
      .map((part: MessageContentPart) => part.text || '')
      .join('\n')
  }

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
      // Extract filename from data URL or use default
      const getImageFilename = (imageData: any, mediaType?: string): string => {
        if (typeof imageData === 'string' && imageData.startsWith('data:')) {
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

      const filename = getImageFilename(part.image.image, part.image.mediaType)
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

  // Get file parts and text parts
  const fileParts = message.content.filter(
    (part: MessageContentPart) => part.type === 'temporary-file' || part.type === 'image'
  )
  const textParts = message.content.filter((part: MessageContentPart) => part.type === 'text')
  const textContent = textParts.map((part: MessageContentPart) => part.text || '').join('\n')

  // Handle edit message
  const handleEdit = async () => {
    onEditOpen()
  }

  // Handle copy
  const handleCopy = async () => {
    try {
      const content = getTextContent()
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

  return (
    <HStack align="flex-start" spacing={2} width="100%" justify="flex-end" mb={2}>
      <VStack align="flex-end" spacing={2} maxWidth="70%">
        {/* File parts - render first */}
        {fileParts.map((part: MessageContentPart, index: number) => (
          <Box key={`file-part-${index}`} alignSelf="flex-end">
            {renderFileContent(part, index)}
          </Box>
        ))}

        {/* Text content - render after files if exists */}
        {textContent.trim() && (
          <Box
            bg={userBg}
            color={userTextColor}
            px={3}
            py={2}
            borderRadius="lg"
            border="1px solid"
            borderColor="rgba(74, 124, 74, 0.2)"
            alignSelf="flex-end"
          >
            <MarkdownContent text={textContent} />
          </Box>
        )}

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
            <Text variant="timestamp">{formatTime(message.updatedAt)}</Text>
          </Box>
        </HStack>
      </VStack>

      {/* Edit Modal */}
      <MessageEditModal
        isOpen={isEditOpen}
        onClose={onEditClose}
        message={message}
        conversationId={message.conversationId}
      />
    </HStack>
  )
}

UserMessage.displayName = 'UserMessage'

export default UserMessage

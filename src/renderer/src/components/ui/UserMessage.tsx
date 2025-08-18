import React, { useState } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue, Image } from '@chakra-ui/react'
import { AttachmentIcon } from '@chakra-ui/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { markdownComponents } from '../../utils/markdownComponents'
import type { Message, MessageContent, MessageContentPart } from '../../../shared/types'
import MessageActionIcons from '../features/chat/MessageActionIcons'

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

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userTextColor = useColorModeValue('text.primary', 'text.primary')

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Render message content parts
  const renderContent = (content: MessageContent) => {
    return content.map((part: MessageContentPart, index: number) => {
      const key = `part-${index}`

      switch (part.type) {
        case 'text':
          if (part.text) {
            return (
              <Box key={key} className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {part.text}
                </ReactMarkdown>
              </Box>
            )
          }
          return null

        case 'temporary-file':
          if (part.temporaryFile) {
            return (
              <Box
                key={key}
                bg="surface.secondary"
                border="1px solid"
                borderColor="border.secondary"
                borderRadius="md"
                p={2}
                minW="120px"
                maxW="200px"
                flexShrink={0}
              >
                <HStack spacing={2} align="center">
                  {/* File Icon */}
                  <AttachmentIcon color="text.secondary" flexShrink={0} boxSize={3} />

                  {/* File Info */}
                  <Box flex={1} minWidth={0}>
                    <Text
                      fontSize="xs"
                      fontWeight="medium"
                      color="text.primary"
                      noOfLines={1}
                      title={part.temporaryFile.filename}
                    >
                      {part.temporaryFile.filename}
                    </Text>
                    <Text fontSize="2xs" color="text.secondary">
                      {Math.round(part.temporaryFile.size / 1024)} KB
                    </Text>
                  </Box>
                </HStack>
              </Box>
            )
          }
          return null

        case 'image':
          if (part.image) {
            return (
              <Box
                key={key}
                bg="surface.secondary"
                border="1px solid"
                borderColor="border.secondary"
                borderRadius="md"
                overflow="hidden"
                minW="120px"
                maxW="200px"
                flexShrink={0}
              >
                {/* Image thumbnail */}
                <Image
                  src={part.image.url}
                  alt={part.image.alt || 'Uploaded image'}
                  objectFit="cover"
                  width="100%"
                  height="80px"
                />

                {/* File info overlay */}
                <Box p={2} bg="surface.secondary">
                  <Text
                    fontSize="xs"
                    fontWeight="medium"
                    color="text.primary"
                    noOfLines={1}
                    title={part.image.alt || 'Image'}
                  >
                    {part.image.alt || 'Image'}
                  </Text>
                  <Text fontSize="2xs" color="text.secondary">
                    {part.image.size ? `${Math.round(part.image.size / 1024)} KB` : 'Image'}
                  </Text>
                </Box>
              </Box>
            )
          }
          return null

        default:
          return null
      }
    })
  }

  return (
    <HStack
      align="flex-start"
      spacing={2}
      width="100%"
      justify="flex-end"
      mb={2}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <VStack align="flex-end" spacing={2} maxWidth="70%">
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
          {renderContent(message.content)}
        </Box>

        <HStack spacing={2} px={1} minHeight="16px" alignItems="center" alignSelf="flex-end">
          {isHovered ? (
            <MessageActionIcons message={message} isVisible={isHovered} />
          ) : (
            showTimestamp && <Text variant="timestamp">{formatTime(message.createdAt)}</Text>
          )}
        </HStack>
      </VStack>
    </HStack>
  )
}

UserMessage.displayName = 'UserMessage'

export default UserMessage

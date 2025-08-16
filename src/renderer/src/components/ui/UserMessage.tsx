import React, { useState } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
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
              <Box key={key}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
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
                p={3}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.200"
                fontSize="sm"
              >
                <Text fontWeight="medium" mb={2}>
                  {part.temporaryFile.filename}
                </Text>
                <Text fontSize="xs" color="gray.600" noOfLines={3}>
                  {part.temporaryFile.content.substring(0, 200)}...
                </Text>
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
      spacing={3}
      width="100%"
      justify="flex-end"
      mb={4}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <VStack align="flex-end" spacing={1} maxWidth="70%">
        <Box
          bg={userBg}
          color={userTextColor}
          px={4}
          py={3}
          borderRadius="lg"
          border="1px solid"
          borderColor="rgba(74, 124, 74, 0.2)"
          width="100%"
        >
          {renderContent(message.content)}
        </Box>

        <Box px={2} minHeight="16px" display="flex" alignItems="center">
          {isHovered ? (
            <MessageActionIcons message={message} isVisible={isHovered} />
          ) : (
            showTimestamp && <Text variant="timestamp">{formatTime(message.createdAt)}</Text>
          )}
        </Box>
      </VStack>
    </HStack>
  )
}

UserMessage.displayName = 'UserMessage'

export default UserMessage

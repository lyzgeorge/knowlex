import React, { useState } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { markdownComponents } from '../../utils/markdownComponents'
import type { Message, MessageContent, MessageContentPart } from '../../../../shared/types'
import MessageActionIcons from '../features/chat/MessageActionIcons'
import { formatTime } from '../../../../shared/utils/time'
import TempFileCard from '../features/chat/TempFileCard'

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

  // Render message content parts: ensure file-like parts (temporary-file, image)
  // are displayed before text parts so TempFileCard appears above the message text.
  const renderContent = (content: MessageContent) => {
    const fileParts = content.filter(
      (p: MessageContentPart) => p.type === 'temporary-file' || p.type === 'image'
    )

    const textParts = content.filter((p: MessageContentPart) => p.type === 'text')

    const renderPart = (part: MessageContentPart, index: number) => {
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
              <TempFileCard
                key={key}
                variant="compact"
                messageFile={{
                  filename: part.temporaryFile.filename,
                  size: part.temporaryFile.size,
                  mimeType: part.temporaryFile.mimeType
                }}
              />
            )
          }
          return null

        case 'image':
          if (part.image) {
            return (
              <TempFileCard
                key={key}
                variant="compact"
                messageFile={{
                  filename: part.image.alt || 'Image',
                  size: part.image.size || 0,
                  mimeType: part.image.mimeType || 'image/*',
                  url: part.image.url
                }}
              />
            )
          }
          return null

        default:
          return null
      }
    }

    return (
      <>
        {fileParts.map((part: MessageContentPart, i: number) => renderPart(part, i))}
        {textParts.map((part: MessageContentPart, i: number) =>
          renderPart(part, fileParts.length + i)
        )}
      </>
    )
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

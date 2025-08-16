import React, { useState } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue, Icon } from '@chakra-ui/react'
import { FaRobot } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import type { Message, MessageContent, MessageContentPart } from '../../../shared/types'
import MessageActionIcons from '../features/chat/MessageActionIcons'
import ReasoningBox from './ReasoningBox'
import { useIsReasoningStreaming, useReasoningStreamingMessageId } from '../../stores/conversation'

export interface AssistantMessageProps {
  /** Message data */
  message: Message
  /** Whether this message is currently being streamed */
  isStreaming?: boolean
  /** Whether to show the avatar */
  showAvatar?: boolean
  /** Whether to show the timestamp */
  showTimestamp?: boolean
}

/**
 * Assistant message component - left-aligned with avatar and reasoning support
 */
export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming = false,
  showAvatar = true,
  showTimestamp = true
}) => {
  const [isHovered, setIsHovered] = useState(false)

  // Reasoning streaming state
  const isReasoningStreaming = useIsReasoningStreaming()
  const reasoningStreamingMessageId = useReasoningStreamingMessageId()
  const isReasoningStreamingForMessage =
    isReasoningStreaming && reasoningStreamingMessageId === message.id

  // Color mode values
  const avatarBg = useColorModeValue('gray.100', 'gray.700')
  const avatarBorder = useColorModeValue('gray.200', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'gray.300')
  const assistantTextColor = useColorModeValue('text.primary', 'text.primary')

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Render text content with streaming cursor
  const renderTextContent = (text: string, showCursor: boolean = false) => {
    // Clean up zero-width space placeholder
    const displayText = text.replace(/\u200B/g, '')

    return (
      <Box as="span" display="inline">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {displayText}
        </ReactMarkdown>
        {showCursor && (
          <Icon
            as={FaRobot}
            boxSize={3}
            color="gray.400"
            ml={1}
            display="inline"
            verticalAlign="baseline"
            animation="flash 1.5s ease-in-out infinite"
            sx={{
              '@keyframes flash': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0.3 }
              }
            }}
          />
        )}
      </Box>
    )
  }

  // Render message content parts
  const renderContent = (content: MessageContent) => {
    return content.map((part: MessageContentPart, index: number) => {
      const key = `part-${index}`
      const isLastTextPart = index === content.length - 1 && part.type === 'text'
      const showCursor = isStreaming && isLastTextPart

      switch (part.type) {
        case 'text':
          // Always render text parts during streaming, even if empty
          if (part.text || showCursor) {
            return <Box key={key}>{renderTextContent(part.text || '', showCursor)}</Box>
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
      justify="flex-start"
      mb={4}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      {showAvatar && (
        <Box
          width="2rem"
          height="2rem"
          bg={avatarBg}
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          border="1px solid"
          borderColor={avatarBorder}
          flexShrink={0}
        >
          <Icon as={FaRobot} boxSize={4} color={iconColor} />
        </Box>
      )}

      {/* Message Content */}
      <VStack align="flex-start" spacing={1} maxWidth="70%" flex={1}>
        {/* Reasoning Box - Show before main content for assistant messages */}
        {(message.reasoning || isReasoningStreamingForMessage) && (
          <Box width="100%">
            <ReasoningBox
              reasoning={message.reasoning}
              isReasoningStreaming={isReasoningStreamingForMessage}
              showWhenEmpty={isReasoningStreamingForMessage}
            />
          </Box>
        )}

        <Box
          bg="transparent"
          color={assistantTextColor}
          px={3}
          py={2}
          borderRadius="lg"
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

AssistantMessage.displayName = 'AssistantMessage'

export default AssistantMessage

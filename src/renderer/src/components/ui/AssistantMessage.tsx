import React, { useState, useCallback } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue, Icon } from '@chakra-ui/react'
import { FaForumbee } from 'react-icons/fa'
import { formatTime } from '../../../../shared/utils/time'
import type { Message } from '../../../../shared/types/message'
import MessageActionIcons from '../features/chat/MessageActionIcons'
import ReasoningBox from './ReasoningBox'
import MessageContentRenderer from './MessageContentRenderer'
import {
  useIsReasoningStreaming,
  useReasoningStreamingMessageId,
  useIsTextStreaming,
  useTextStreamingMessageId
} from '../../stores/conversation'

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

  // Text streaming state
  const isTextStreaming = useIsTextStreaming()
  const textStreamingMessageId = useTextStreamingMessageId()
  const isTextStreamingForMessage = isTextStreaming && textStreamingMessageId === message.id

  // Color mode values
  const avatarBg = useColorModeValue('gray.100', 'gray.700')
  const avatarBorder = useColorModeValue('gray.200', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'gray.300')
  const assistantTextColor = useColorModeValue('text.primary', 'text.primary')

  const handleMouseEnter = useCallback(() => {
    setIsHovered((prev) => (prev ? prev : true))
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered((prev) => (prev ? false : prev))
  }, [])

  return (
    <HStack align="flex-start" spacing={3} width="100%" justify="flex-start" mb={4}>
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
          <Icon as={FaForumbee} boxSize={4} color={iconColor} />
        </Box>
      )}

      {/* Message Content */}
      <VStack align="flex-start" spacing={2} maxWidth="70%" flex={1}>
        {/* Reasoning Box - Show before main content for assistant messages */}
        {(message.reasoning || isReasoningStreamingForMessage) && (
          <Box alignSelf="flex-start">
            <ReasoningBox
              {...(message.reasoning ? { reasoning: message.reasoning } : {})}
              isReasoningStreaming={isReasoningStreamingForMessage}
              isTextStreaming={isTextStreamingForMessage}
              showWhenEmpty={isReasoningStreamingForMessage}
            />
          </Box>
        )}

        <Box
          bg="transparent"
          color={assistantTextColor}
          px={2}
          py={0}
          borderRadius="lg"
          alignSelf="flex-start"
        >
          <MessageContentRenderer
            content={message.content}
            variant="assistant"
            isStreaming={isStreaming}
            showCursor={true}
            isReasoningStreaming={isReasoningStreamingForMessage}
          />
        </Box>

        <HStack
          spacing={2}
          px={1}
          minHeight="16px"
          alignItems="center"
          alignSelf="flex-start"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Box display={isHovered ? 'flex' : 'none'}>
            <MessageActionIcons message={message} isVisible={true} />
          </Box>
          <Box display={!isHovered && showTimestamp ? 'block' : 'none'}>
            <Text variant="timestamp">{formatTime(message.createdAt)}</Text>
          </Box>
        </HStack>
      </VStack>
    </HStack>
  )
}

AssistantMessage.displayName = 'AssistantMessage'

export default AssistantMessage

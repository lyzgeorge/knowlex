import React, { useState, useCallback } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue, Icon, IconButton } from '@chakra-ui/react'
import { HiSparkles, HiClipboard } from 'react-icons/hi2'
import { formatTime } from '@shared/utils/time'
import type { Message, MessageContentPart } from '@shared/types/message'
import ReasoningBox from './ReasoningBox'
import MarkdownContent from './MarkdownContent'
import { useNotifications } from '@renderer/components/ui'
import {
  useIsReasoningStreaming,
  useReasoningStreamingMessageId,
  useIsTextStreaming,
  useTextStreamingMessageId
} from '@renderer/stores/conversation'

export interface AssistantMessageProps {
  /** Message data */
  message: Message
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
  showAvatar = true,
  showTimestamp = true
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const notifications = useNotifications()

  // Reasoning streaming state
  const isReasoningStreaming = useIsReasoningStreaming()
  const reasoningStreamingMessageId = useReasoningStreamingMessageId()
  const isReasoningStreamingForMessage =
    isReasoningStreaming && reasoningStreamingMessageId === message.id

  // Text streaming state
  const isTextStreaming = useIsTextStreaming()
  const textStreamingMessageId = useTextStreamingMessageId()
  const isTextStreamingForMessage = isTextStreaming && textStreamingMessageId === message.id

  // Debug logging for streaming states
  if (message.id && (isTextStreamingForMessage || isReasoningStreamingForMessage)) {
    console.log(
      `[AssistantMessage] ${message.id}: text=${isTextStreamingForMessage}, reasoning=${isReasoningStreamingForMessage}, showIcon=${isTextStreamingForMessage && !isReasoningStreamingForMessage}`
    )
  }

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

  // Get text content only
  const getTextContent = () => {
    return message.content
      .filter((part: MessageContentPart) => part.type === 'text')
      .map((part: MessageContentPart) => part.text || '')
      .join('\n')
  }

  // Get text content for rendering
  const textContent = getTextContent()

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
          <Icon as={HiSparkles} boxSize={4} color={iconColor} />
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

        {/* Text content */}
        {(textContent.trim() || isTextStreamingForMessage) && (
          <Box
            bg="transparent"
            color={assistantTextColor}
            px={2}
            py={0}
            borderRadius="lg"
            alignSelf="flex-start"
          >
            <MarkdownContent
              text={textContent}
              isStreaming={isTextStreamingForMessage}
              // External streaming indicator is shown below; hide inline cursor
              showCursor={false}
            />
          </Box>
        )}

        {/* Text streaming indicator (blinking HiSparkles) when text is streaming */}
        {isTextStreamingForMessage && (
          <HStack spacing={2} px={2} align="center" alignSelf="flex-start">
            <Icon
              as={HiSparkles}
              boxSize={3}
              color={iconColor}
              animation="flash 1.5s ease-in-out infinite"
              sx={{
                '@keyframes flash': {
                  '0%, 50%': { opacity: 1 },
                  '51%, 100%': { opacity: 0.3 }
                }
              }}
            />
          </HStack>
        )}

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
            <IconButton
              aria-label="Copy to clipboard"
              icon={<HiClipboard />}
              size="xs"
              variant="ghost"
              onClick={handleCopy}
              _hover={{ bg: 'surface.hover' }}
            />
          </Box>
          <Box display={!isHovered && showTimestamp ? 'block' : 'none'}>
            <Text variant="timestamp">{formatTime(message.updatedAt)}</Text>
          </Box>
        </HStack>
      </VStack>
    </HStack>
  )
}

AssistantMessage.displayName = 'AssistantMessage'

export default AssistantMessage

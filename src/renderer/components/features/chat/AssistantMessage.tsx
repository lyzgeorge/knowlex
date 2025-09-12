/**
 * Assistant message component - left-aligned with avatar and reasoning support
 *
 * Features:
 * - Uses shared copyMessageText utility
 * - Uses normalized view model to reduce calculations
 * - Cleaner prop surface with view model pattern
 */

import React, { useState, useCallback } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue, Icon, IconButton } from '@chakra-ui/react'
import { HiSparkles, HiClipboard, HiArrowPath } from 'react-icons/hi2'
import type { Message } from '@shared/types/message'
import { createAssistantMessageViewModel } from '@shared/utils/message-view-models'
import ReasoningBox from './ReasoningBox'
import { MarkdownContent } from '@renderer/utils/markdownComponents'
import { useMessageActions } from '@renderer/hooks/useMessageActions'
import { useStreamingPhase } from '@renderer/hooks/useStreamingPhase'

export interface AssistantMessageProps {
  /** Message data */
  message: Message
  /** Whether to show the avatar */
  showAvatar?: boolean
  /** Whether to show the timestamp */
  showTimestamp?: boolean
  /** Whether this is the latest assistant message (for regenerate permission) */
  isLatestAssistantMessage?: boolean
}

/**
 * Assistant message component - left-aligned with avatar and reasoning support
 */
export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  showAvatar = true,
  showTimestamp = true,
  isLatestAssistantMessage = false
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const messageActions = useMessageActions()

  // Create normalized view model
  const viewModel = createAssistantMessageViewModel(message)

  // Unified streaming state
  const streaming = useStreamingPhase(message.id)

  // Color mode values
  const avatarBg = useColorModeValue('gray.100', 'gray.700')
  const avatarBorder = useColorModeValue('gray.200', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'gray.300')
  const assistantTextColor = useColorModeValue('text.primary', 'text.primary')

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  // Handle copy using unified message actions
  const handleCopy = useCallback(async () => {
    await messageActions.copy(message)
  }, [message, messageActions])

  // Handle regenerate using unified message actions
  const handleRegenerate = useCallback(async () => {
    await messageActions.regenerate(message.id)
  }, [message.id, messageActions])

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
        {(viewModel.hasReasoning || streaming.isReasoningStreaming) && (
          <Box alignSelf="flex-start">
            <ReasoningBox
              {...(viewModel.reasoning ? { reasoning: viewModel.reasoning } : {})}
              isReasoningStreaming={streaming.isReasoningStreaming}
              isTextStreaming={streaming.isTextStreaming}
              showWhenEmpty={streaming.isReasoningStreaming}
            />
          </Box>
        )}

        {/* Text content using view model */}
        {(viewModel.visibleText || streaming.isTextStreaming) && (
          <Box
            bg="transparent"
            color={assistantTextColor}
            px={2}
            py={0}
            borderRadius="lg"
            alignSelf="flex-start"
            width="100%"
            maxWidth="100%"
            overflow="hidden"
          >
            <MarkdownContent text={viewModel.visibleText} />
          </Box>
        )}

        {/* Streaming indicator (blinking HiSparkles) when streaming starts */}
        {streaming.isStartStreaming && (
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
          <HStack spacing={1} display={isHovered ? 'flex' : 'none'}>
            {/* Only show regenerate button for the latest assistant message */}
            {messageActions.canRegenerate(message, isLatestAssistantMessage) && (
              <IconButton
                aria-label="Regenerate message"
                icon={<HiArrowPath />}
                size="xs"
                variant="ghost"
                onClick={handleRegenerate}
                _hover={{ bg: 'surface.hover' }}
              />
            )}
            <IconButton
              aria-label="Copy to clipboard"
              icon={<HiClipboard />}
              size="xs"
              variant="ghost"
              onClick={handleCopy}
              _hover={{ bg: 'surface.hover' }}
            />
          </HStack>
          {!isHovered && showTimestamp && (
            <Text variant="timestamp">{viewModel.formattedTimestamp}</Text>
          )}
        </HStack>
      </VStack>
    </HStack>
  )
}

AssistantMessage.displayName = 'AssistantMessage'

export default AssistantMessage

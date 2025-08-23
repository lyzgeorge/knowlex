import React, { useMemo } from 'react'
import { Box, VStack, IconButton } from '@chakra-ui/react'
import { useCurrentConversation } from '../../../stores/conversation'
import ChatInputBox from './ChatInputBox'
import UserMessage from '../../ui/UserMessage'
import AssistantMessage from '../../ui/AssistantMessage'
import { useAutoScroll } from '../../../hooks/useAutoScroll'
import { FiChevronDown } from 'react-icons/fi'

export interface ConversationPageProps {
  /** Additional CSS classes */
  className?: string | undefined
}

/**
 * Conversation page component
 *
 * Shows the active conversation with messages and input box.
 * Features:
 * - Message list with auto-scroll
 * - Floating conversation input box
 * - Scroll-to-bottom button when not at bottom
 */
export const ConversationPage: React.FC<ConversationPageProps> = ({ className }) => {
  const { currentMessages } = useCurrentConversation()

  // Optimized dependencies - track actual content changes for auto-scroll
  const scrollDependencies = useMemo(() => {
    const assistantMessages = currentMessages.filter((msg: any) => msg.role === 'assistant')
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

    // Calculate total text length for streaming detection
    const totalTextLength =
      lastAssistantMessage?.content?.reduce((total: number, part: any) => {
        if (part.type === 'text' && typeof part.text === 'string') {
          return total + part.text.length
        }
        return total
      }, 0) || 0

    return [
      currentMessages.length, // Total message count (includes user messages)
      assistantMessages.length, // Number of assistant messages
      lastAssistantMessage?.id, // ID of last assistant message
      lastAssistantMessage?.content?.length, // Number of content parts
      totalTextLength // Total text length (grows during streaming)
    ]
  }, [currentMessages])

  // Auto-scroll with optimized sticky detection
  const { scrollRef, anchorRef, forceScrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>(
    scrollDependencies,
    {
      threshold: 128, // 8rem range for hiding scroll button (8 * 16px = 128px)
      enabled: true,
      smooth: true, // Smooth scrolling behavior
      follow: false
    }
  )

  // Track user message count to force scroll on user messages
  const userMessageCount = useMemo(
    () => currentMessages.filter((msg: any) => msg.role === 'user').length,
    [currentMessages]
  )

  // Force scroll when user sends a message (runs after user message is added)
  React.useEffect(() => {
    if (userMessageCount > 0) {
      // Scroll to bottom; bottom padding ensures last 6rem of user message remains visible
      forceScrollToBottom()
    }
  }, [userMessageCount, forceScrollToBottom])

  return (
    <Box
      flex={1}
      display="flex"
      flexDirection="column"
      h="100%"
      className={className}
      position="relative"
    >
      {/* Messages Area - Full height with floating input */}
      <Box
        ref={scrollRef}
        flex={1}
        overflowY="auto"
        minH={0}
        h="100%"
        px={4}
        py={6}
        pb="6rem"
        sx={{
          overflowAnchor: 'none', // Disable scroll anchoring to prevent conflicts
          scrollBehavior: 'auto' // Let our hook control scroll behavior
        }}
      >
        {/* Message List - Inline rendering */}
        <VStack spacing={4} align="stretch">
          {currentMessages.map((message) => (
            <Box key={message.id} role="listitem">
              {message.role === 'user' ? (
                <UserMessage message={message} showTimestamp={true} />
              ) : (
                <AssistantMessage message={message} showAvatar={true} showTimestamp={true} />
              )}
            </Box>
          ))}
        </VStack>
        {/* Bottom anchor for robust sticky auto-scroll */}
        <Box ref={anchorRef} height="1px" visibility="hidden" aria-hidden />
      </Box>

      {/* Floating Input Area */}
      <Box position="absolute" bottom={0} left={0} right={0} zIndex={10} pointerEvents="none">
        {/* Scroll-to-bottom chevron positioned relative to input area */}
        {!isAtBottom && (
          <Box
            position="absolute"
            left={0}
            right={0}
            bottom="100%"
            display="flex"
            justifyContent="center"
            zIndex={1}
            pointerEvents="auto"
          >
            <IconButton
              aria-label="Scroll to bottom"
              icon={<FiChevronDown />}
              size="sm"
              colorScheme="gray"
              variant="solid"
              borderRadius="full"
              boxShadow="md"
              onClick={() => forceScrollToBottom()}
            />
          </Box>
        )}

        <Box pointerEvents="auto">
          <ChatInputBox variant="conversation" />
        </Box>
      </Box>
    </Box>
  )
}

ConversationPage.displayName = 'ConversationPage'

export default ConversationPage

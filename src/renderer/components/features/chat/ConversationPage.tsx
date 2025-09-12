/**
 * Conversation page component with MessageBranchingProvider
 *
 * Features:
 * - Uses MessageBranchingProvider to wrap message components
 * - No longer needs to manually pass branchInfo and onBranchChange
 * - Uses shared getLastAssistantMessage utility
 * - Cleaner component structure with centralized branching logic
 */

import React, { useMemo } from 'react'
import { Box, VStack, IconButton } from '@chakra-ui/react'
import { useCurrentConversation } from '@renderer/stores/conversation/index'
import ChatInputBox from './ChatInputBox'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'
import { ConversationHeader } from './ConversationHeader'
import { useAutoScroll } from '@renderer/hooks/useAutoScroll'
import { MessageBranchingProvider, useBranching } from '@renderer/contexts/MessageBranchingContext'
import { HiArrowDown } from 'react-icons/hi2'

export interface ConversationPageProps {
  /** Additional CSS classes */
  className?: string | undefined
}

/**
 * Inner component that uses the branching context
 */
const ConversationContent: React.FC<ConversationPageProps> = ({ className }) => {
  const { filteredMessages } = useBranching()

  // Optimized dependencies - derive metrics in single pass to avoid multiple scans
  const { scrollMetrics, latestAssistantMessage } = useMemo(() => {
    let assistantCount = 0
    let lastAssistant = null

    // Single pass through messages
    for (const message of filteredMessages) {
      if (message.role === 'assistant') {
        assistantCount++
        lastAssistant = message
      }
    }

    // Calculate total text length for streaming detection
    const totalTextLength =
      lastAssistant?.content?.reduce((total: number, part: any) => {
        if (part.type === 'text' && typeof part.text === 'string') {
          return total + part.text.length
        }
        return total
      }, 0) || 0

    const metrics = [
      filteredMessages.length, // Total message count
      assistantCount, // Number of assistant messages
      lastAssistant?.id, // ID of last assistant message
      lastAssistant?.content?.length, // Number of content parts
      totalTextLength // Total text length (grows during streaming)
    ]

    return { scrollMetrics: metrics, latestAssistantMessage: lastAssistant }
  }, [filteredMessages])

  // Auto-scroll with optimized sticky detection
  const { scrollRef, anchorRef, forceScrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>(
    scrollMetrics,
    {
      threshold: 128, // 8rem range for hiding scroll button (8 * 16px = 128px)
      enabled: true,
      smooth: true, // Smooth scrolling behavior
      follow: false
    }
  )

  // Track user message count to force scroll on user messages
  const userMessageCount = useMemo(
    () => filteredMessages.filter((msg: any) => msg.role === 'user').length,
    [filteredMessages]
  )

  // latestAssistantMessage already computed above in scrollMetrics memo

  // Also scroll when user message count increases (additional trigger)
  React.useEffect(() => {
    if (userMessageCount > 0) {
      // Immediate scroll and delayed scroll for safety
      forceScrollToBottom()
      setTimeout(() => forceScrollToBottom(), 300)
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
      {/* Conversation Header */}
      <ConversationHeader />

      {/* Messages Area - Full height with floating input */}
      <Box
        ref={scrollRef}
        flex={1}
        overflowY="auto"
        minH={0}
        h="100%"
        px={4}
        py={6}
        pb="8rem"
        sx={{
          overflowAnchor: 'none', // Disable scroll anchoring to prevent conflicts
          scrollBehavior: 'auto' // Let our hook control scroll behavior
        }}
      >
        {/* Message List - No more manual prop passing */}
        <VStack spacing={4} align="stretch">
          {filteredMessages.map((message) => {
            const isLatestAssistantMessage =
              message.role === 'assistant' &&
              latestAssistantMessage &&
              message.id === latestAssistantMessage.id

            return (
              <Box key={message.id} role="listitem">
                {message.role === 'user' ? (
                  <UserMessage
                    message={message}
                    showTimestamp={true}
                    // No more branchInfo or onBranchChange props needed!
                  />
                ) : (
                  <Box minH={isLatestAssistantMessage ? 'calc(100vh - 20rem)' : 'auto'}>
                    <AssistantMessage
                      message={message}
                      showAvatar={true}
                      showTimestamp={true}
                      isLatestAssistantMessage={!!isLatestAssistantMessage}
                    />
                  </Box>
                )}
              </Box>
            )
          })}
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
              icon={<HiArrowDown />}
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
          {/* No more redundant branching prop needed! */}
          <ChatInputBox variant="conversation" />
        </Box>
      </Box>
    </Box>
  )
}

/**
 * Conversation page component with MessageBranchingProvider
 */
export const ConversationPage: React.FC<ConversationPageProps> = ({ className }) => {
  const { currentMessages } = useCurrentConversation()

  return (
    <MessageBranchingProvider messages={currentMessages}>
      <ConversationContent className={className} />
    </MessageBranchingProvider>
  )
}

ConversationPage.displayName = 'ConversationPage'

export default ConversationPage

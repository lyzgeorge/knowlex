import React, { useMemo } from 'react'
import { Box, VStack, IconButton } from '@chakra-ui/react'
import { useCurrentConversation } from '@renderer/stores/conversation'
import ChatInputBox from './ChatInputBox'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'
import { ConversationHeader } from './ConversationHeader'
import { useAutoScroll } from '@renderer/hooks/useAutoScroll'
import { useMessageBranching } from '@renderer/hooks/useMessageBranching'
import { HiArrowDown } from 'react-icons/hi2'

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

  // Use message branching hook to filter messages based on active branches
  const { filteredMessages, setBranchIndex, getBranchInfo } = useMessageBranching(currentMessages)

  // Optimized dependencies - track actual content changes for auto-scroll
  const scrollDependencies = useMemo(() => {
    const assistantMessages = filteredMessages.filter((msg: any) => msg.role === 'assistant')
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
      filteredMessages.length, // Total message count (includes user messages)
      assistantMessages.length, // Number of assistant messages
      lastAssistantMessage?.id, // ID of last assistant message
      lastAssistantMessage?.content?.length, // Number of content parts
      totalTextLength // Total text length (grows during streaming)
    ]
  }, [filteredMessages])

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
    () => filteredMessages.filter((msg: any) => msg.role === 'user').length,
    [filteredMessages]
  )

  // Get the latest assistant message
  const latestAssistantMessage = useMemo(() => {
    const assistantMessages = filteredMessages.filter((msg: any) => msg.role === 'assistant')
    return assistantMessages[assistantMessages.length - 1] || null
  }, [filteredMessages])

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
        {/* Message List - Inline rendering with branching */}
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
                    branchInfo={getBranchInfo(message)}
                    onBranchChange={(index) => {
                      const parentKey = message.parentMessageId ?? '__ROOT__'
                      setBranchIndex(parentKey, index)
                    }}
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
          <ChatInputBox variant="conversation" branching={{ filteredMessages }} />
        </Box>
      </Box>
    </Box>
  )
}

ConversationPage.displayName = 'ConversationPage'

export default ConversationPage

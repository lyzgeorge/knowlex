import React, { useEffect, useRef, useLayoutEffect } from 'react'
import { Box, VStack, Text } from '@chakra-ui/react'
import { Message } from '../../../shared/types/message'
import MessageBubble from '../../ui/MessageBubble'
import { useStreamingMessageId } from '../../../stores/conversation'

export interface MessageListProps {
  /** Array of messages to display */
  messages: Message[]
  /** Additional CSS classes */
  className?: string
}

/**
 * 消息列表组件 - Task 17
 *
 * 实现要求:
 * - 虚拟滚动，消息渲染，自动滚动
 * - 使用MessageBubble组件渲染消息
 * - 支持流式消息更新，平滑滚动行为
 * - 空状态处理，无消息时显示提示
 */
export const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const streamingMessageId = useStreamingMessageId()
  const lastMessageIdRef = useRef<string | null>(null)

  // Helper function to scroll to bottom
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior
      })
    }
  }

  // Check if user is near bottom of scroll area
  const isUserNearBottom = () => {
    const container = scrollContainerRef.current
    if (!container) return false
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100
  }

  // Auto-scroll when new messages arrive
  useLayoutEffect(() => {
    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    const lastMessageId = lastMessage?.id

    // Check if this is a new message by comparing IDs
    const isNewMessage = lastMessageIdRef.current !== lastMessageId
    lastMessageIdRef.current = lastMessageId

    // Auto-scroll conditions:
    // 1. New message arrived and user was near bottom
    // 2. First few messages (always scroll)
    // 3. Currently streaming (always follow streaming)
    if (isNewMessage && (messages.length <= 2 || isUserNearBottom() || streamingMessageId)) {
      // Add a small delay to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        scrollToBottom(messages.length <= 2 ? 'auto' : 'smooth')
      })
    }
  }, [messages, streamingMessageId])

  // Additional effect specifically for streaming updates
  useEffect(() => {
    if (streamingMessageId) {
      // Always follow streaming messages with a small delay to ensure content is rendered
      requestAnimationFrame(() => {
        scrollToBottom('smooth')
      })
    }
  }, [streamingMessageId])

  // Effect to handle scroll when message content changes (e.g., during streaming)
  useEffect(() => {
    if (streamingMessageId && messages.length > 0) {
      const streamingMessage = messages.find((msg) => msg.id === streamingMessageId)
      if (streamingMessage && isUserNearBottom()) {
        // Small delay to let the content render
        const timeoutId = setTimeout(() => {
          scrollToBottom('smooth')
        }, 100)

        return () => clearTimeout(timeoutId)
      }
    }
  }, [messages, streamingMessageId])

  // Empty state
  if (messages.length === 0) {
    return (
      <Box
        ref={scrollContainerRef}
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        p={8}
        className={className}
      >
        <Text fontSize="md" color="text.tertiary" textAlign="center">
          No messages yet. Start the conversation!
        </Text>
      </Box>
    )
  }

  return (
    <Box
      ref={scrollContainerRef}
      flex={1}
      overflowY="auto"
      px={4}
      py={6}
      pb="6rem"
      className={className}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      <VStack spacing={4} align="stretch">
        {messages.map((message) => (
          <Box key={message.id} role="listitem">
            <MessageBubble
              message={message}
              isStreaming={streamingMessageId === message.id}
              showAvatar={true}
              showTimestamp={true}
            />
          </Box>
        ))}
      </VStack>
    </Box>
  )
}

MessageList.displayName = 'MessageList'

export default MessageList

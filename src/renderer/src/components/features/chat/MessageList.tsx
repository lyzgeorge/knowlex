import React from 'react'
import { Box, VStack, Text } from '@chakra-ui/react'
import { Message } from '../../../shared/types/message'
import MessageBubble from '../../ui/MessageBubble'

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
 * - 虚拟滚动，消息渲染
 * - 使用MessageBubble组件渲染消息
 * - 支持流式消息更新
 * - 空状态处理，无消息时显示提示
 */
export const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  // Empty state
  if (messages.length === 0) {
    return (
      <Box
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
    <VStack spacing={4} align="stretch" className={className}>
      {messages.map((message) => (
        <Box key={message.id} role="listitem">
          <MessageBubble message={message} showAvatar={true} showTimestamp={true} />
        </Box>
      ))}
    </VStack>
  )
}

MessageList.displayName = 'MessageList'

export default MessageList

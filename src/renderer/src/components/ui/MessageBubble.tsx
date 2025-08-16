import React from 'react'
import type { Message } from '../../../shared/types'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'

export interface MessageBubbleProps {
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
 * Unified MessageBubble component that delegates to UserMessage or AssistantMessage
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  showAvatar = true,
  showTimestamp = true
}) => {
  if (message.role === 'user') {
    return <UserMessage message={message} showTimestamp={showTimestamp} />
  }

  return (
    <AssistantMessage
      message={message}
      isStreaming={isStreaming}
      showAvatar={showAvatar}
      showTimestamp={showTimestamp}
    />
  )
}

MessageBubble.displayName = 'MessageBubble'

export default MessageBubble

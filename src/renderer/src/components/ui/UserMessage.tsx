import React, { useState } from 'react'
import { Box, VStack, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import type { Message } from '../../../../shared/types/message'
import MessageActionIcons from '../features/chat/MessageActionIcons'
import { formatTime } from '../../../../shared/utils/time'
import MessageContentRenderer from './MessageContentRenderer'

export interface UserMessageProps {
  /** Message data */
  message: Message
  /** Whether to show the timestamp */
  showTimestamp?: boolean
}

/**
 * User message component - right-aligned bubble
 */
export const UserMessage: React.FC<UserMessageProps> = ({ message, showTimestamp = true }) => {
  const [isHovered, setIsHovered] = useState(false)

  // Theme colors
  const userBg = useColorModeValue('rgba(74, 124, 74, 0.08)', 'rgba(74, 124, 74, 0.12)')
  const userTextColor = useColorModeValue('text.primary', 'text.primary')

  return (
    <HStack
      align="flex-start"
      spacing={2}
      width="100%"
      justify="flex-end"
      mb={2}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <VStack align="flex-end" spacing={2} maxWidth="70%">
        <Box
          bg={userBg}
          color={userTextColor}
          px={3}
          py={2}
          borderRadius="lg"
          border="1px solid"
          borderColor="rgba(74, 124, 74, 0.2)"
          alignSelf="flex-end"
        >
          <MessageContentRenderer content={message.content} variant="user" />
        </Box>

        <HStack spacing={2} px={1} minHeight="16px" alignItems="center" alignSelf="flex-end">
          {isHovered ? (
            <MessageActionIcons message={message} isVisible={isHovered} />
          ) : (
            showTimestamp && <Text variant="timestamp">{formatTime(message.createdAt)}</Text>
          )}
        </HStack>
      </VStack>
    </HStack>
  )
}

UserMessage.displayName = 'UserMessage'

export default UserMessage

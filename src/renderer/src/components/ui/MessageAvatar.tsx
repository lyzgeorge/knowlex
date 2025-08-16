import React from 'react'
import { Box, Icon, useColorModeValue } from '@chakra-ui/react'
import { FaRobot, FaUser } from 'react-icons/fa'

export interface MessageAvatarProps {
  /** Message role to determine avatar type */
  role: 'user' | 'assistant'
  /** Custom size for the avatar */
  size?: string | number
}

/**
 * Atomic avatar component for messages
 */
export const MessageAvatar: React.FC<MessageAvatarProps> = ({ role, size = '2rem' }) => {
  const avatarBg = useColorModeValue('gray.100', 'gray.700')
  const avatarBorder = useColorModeValue('gray.200', 'gray.600')
  const iconColor = useColorModeValue('gray.600', 'gray.300')

  const IconComponent = role === 'assistant' ? FaRobot : FaUser

  return (
    <Box
      width={size}
      height={size}
      bg={avatarBg}
      borderRadius="md"
      display="flex"
      alignItems="center"
      justifyContent="center"
      border="1px solid"
      borderColor={avatarBorder}
      flexShrink={0}
    >
      <Icon as={IconComponent} boxSize={4} color={iconColor} />
    </Box>
  )
}

MessageAvatar.displayName = 'MessageAvatar'

export default MessageAvatar

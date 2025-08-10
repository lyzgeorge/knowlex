import { HStack, Text, Menu, MenuButton, MenuList, MenuItem, Icon } from '@chakra-ui/react'
import { ChatBubbleLeftIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline'
import { Chat } from '../../lib/types'
import { formatTimestamp } from '../../lib/time'
import { useUIStore } from '../../stores'
import { NavIconButton } from '../atoms/NavIconButton'
import { useState } from 'react'

interface ChatItemProps {
  chat: Chat
  // This prop will be used to conditionally show 'Move out of project'
  isInProject?: boolean
}

export const ChatItem = ({ chat, isInProject = false }: ChatItemProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const { activeChatId, setActiveChatId } = useUIStore()
  const isActive = activeChatId === chat.id

  return (
    <HStack
      w="100%"
      px={2}
      py={1.5}
      borderRadius="md"
      bg={isActive ? 'whiteAlpha.200' : 'transparent'}
      _hover={{ bg: 'whiteAlpha.100' }}
      cursor="pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setActiveChatId(chat.id)}
    >
      <Icon as={ChatBubbleLeftIcon} boxSize={5} color="gray.400" />
      <Text noOfLines={1} flex={1} fontSize="sm">
        {chat.title}
      </Text>
      {!isHovered ? (
        <Text fontSize="xs" color="gray.500">
          {formatTimestamp(chat.lastUpdatedAt)}
        </Text>
      ) : (
        <Menu>
          <MenuButton
            as={NavIconButton}
            icon={EllipsisVerticalIcon}
            label="More options"
            onClick={(e) => e.stopPropagation()}
          />
          <MenuList>
            <MenuItem>Move to project...</MenuItem>
            {isInProject && <MenuItem>Move out of project</MenuItem>}
            <MenuItem>Rename</MenuItem>
            <MenuItem color="red.400">Delete</MenuItem>
          </MenuList>
        </Menu>
      )}
    </HStack>
  )
}

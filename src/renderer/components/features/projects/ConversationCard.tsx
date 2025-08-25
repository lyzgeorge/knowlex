import React from 'react'
import { Box, HStack, Text, IconButton } from '@chakra-ui/react'
import { HamburgerIcon } from '@chakra-ui/icons'
import type { Conversation } from '@shared/types/conversation'
import { formatRelativeTime } from '@shared/utils/time'

interface ConversationCardProps {
  conversation: Conversation
  onOpen: (id: string) => void
  onMenu?: (id: string) => void
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  conversation,
  onOpen,
  onMenu
}) => {
  return (
    <Box
      border="1px solid"
      borderColor="border.secondary"
      borderRadius="md"
      p={3}
      _hover={{ bg: 'surface.hover' }}
      cursor="pointer"
      onClick={() => onOpen(conversation.id)}
    >
      <HStack justify="space-between" align="center">
        <Text fontWeight="medium" noOfLines={1}>
          {conversation.title}
        </Text>
        <HStack spacing={2}>
          <Text fontSize="xs" color="text.tertiary">
            {formatRelativeTime(conversation.updatedAt)}
          </Text>
          {onMenu && (
            <IconButton
              aria-label="Conversation options"
              icon={<HamburgerIcon />}
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onMenu(conversation.id)
              }}
            />
          )}
        </HStack>
      </HStack>
    </Box>
  )
}

export default ConversationCard

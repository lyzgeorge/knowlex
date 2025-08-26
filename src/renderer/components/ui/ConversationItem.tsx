import React from 'react'
import { Box, HStack, Text, Input, IconButton, Tooltip } from '@chakra-ui/react'
import { LiaCheckSolid, LiaTimesSolid } from 'react-icons/lia'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'

interface ConversationItemProps {
  conversation: {
    id: string
    title: string
    updatedAt?: string
    projectId?: string | null
  }
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  editingConversationId?: string | null
  editingTitle?: string
  setEditingTitle?: (title: string) => void
  onStartEdit?: (id: string, title: string) => void
  onCancelEdit?: () => void
  onConfirmEdit?: () => void
  onInputBlur?: () => void
  isNested?: boolean
  currentProjectId?: string | null
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  editingConversationId,
  editingTitle = '',
  setEditingTitle,
  onStartEdit,
  onCancelEdit,
  onConfirmEdit,
  onInputBlur,
  currentProjectId = null
}) => {
  const isCurrentConversation = currentConversationId === conversation.id
  const isEditing = editingConversationId === conversation.id

  return (
    <HStack
      role="listitem"
      p={2}
      pl={2}
      borderRadius="md"
      cursor="pointer"
      bg={isCurrentConversation ? 'primary.50' : 'transparent'}
      borderLeft={isCurrentConversation ? '3px solid' : 'none'}
      borderColor="primary.500"
      transition="all 0.2s"
      _hover={{
        bg: isCurrentConversation ? 'primary.100' : 'surface.hover'
      }}
      onClick={() => onSelectConversation(conversation.id)}
      justify="space-between"
      align="center"
    >
      {/* Conversation Title */}
      {isEditing ? (
        <HStack flex={1} spacing={1}>
          <Input
            value={editingTitle}
            onChange={(e) => setEditingTitle?.(e.target.value)}
            fontSize="sm"
            fontWeight="medium"
            variant="unstyled"
            size="sm"
            h="24px"
            lineHeight="24px"
            px={0}
            py={0}
            bg="transparent"
            _focus={{ boxShadow: 'none', bg: 'transparent' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onConfirmEdit?.()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                onCancelEdit?.()
              }
            }}
            onBlur={onInputBlur}
            autoFocus
          />
        </HStack>
      ) : (
        <Tooltip
          label={conversation.title}
          placement="right"
          hasArrow
          openDelay={600}
          closeDelay={200}
          bg="surface.primary"
          color="text.primary"
          borderRadius="md"
          border="1px solid"
          borderColor="border.primary"
          shadow="dropdown"
          fontSize="sm"
          fontWeight="medium"
          px={3}
          py={2}
          maxW="280px"
          textAlign="left"
          whiteSpace="normal"
        >
          <Text fontSize="sm" noOfLines={1} flex={1} py={0.5} minW={0}>
            {conversation.title}
          </Text>
        </Tooltip>
      )}

      {/* Time or Action Icons: show timestamp by default, replace with menu on hover */}
      <Box minW="80px" display="flex" justifyContent="space-between" alignItems="center">
        {isEditing ? (
          <HStack spacing={1}>
            <IconButton
              aria-label="Confirm rename"
              icon={<LiaCheckSolid />}
              size="xs"
              variant="ghost"
              color="green.500"
              _hover={{ bg: 'green.50', color: 'green.600' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                onConfirmEdit?.()
              }}
            />
            <IconButton
              aria-label="Cancel rename"
              icon={<LiaTimesSolid />}
              size="xs"
              variant="ghost"
              color="gray.500"
              _hover={{ bg: 'gray.50', color: 'gray.600' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                onCancelEdit?.()
              }}
            />
          </HStack>
        ) : (
          <ConversationMenu
            conversationId={conversation.id}
            currentProjectId={currentProjectId}
            onRename={() => onStartEdit?.(conversation.id, conversation.title)}
            onDelete={() => onDeleteConversation(conversation.id)}
            updatedAt={conversation.updatedAt}
          />
        )}
      </Box>
    </HStack>
  )
}

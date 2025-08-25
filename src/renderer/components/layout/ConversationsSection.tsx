import React from 'react'
import { Box, HStack, VStack, Text, Input, IconButton, Tooltip, Spinner } from '@chakra-ui/react'
import { CheckIcon, CloseIcon } from '@chakra-ui/icons'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import { formatRelativeTime } from '@shared/utils/time'
import { useInlineEdit } from '@renderer/hooks/useInlineEdit'

interface ConversationsSectionProps {
  conversations: Array<{
    id: string
    title: string
    updatedAt: string
    projectId?: string | null
  }>
  currentConversationId: string | null
  hoveredConversation: string | null
  onConversationHover: (id: string | null) => void
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  isLoadingMore: boolean
  hasMoreConversations: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
}

export const ConversationsSection: React.FC<ConversationsSectionProps> = ({
  conversations,
  currentConversationId,
  hoveredConversation,
  onConversationHover,
  onSelectConversation,
  onDeleteConversation,
  isLoadingMore,
  hasMoreConversations,
  sentinelRef
}) => {
  const {
    editingConversationId,
    editingTitle,
    setEditingTitle,
    handleStartEdit,
    handleCancelEdit,
    handleInputBlur,
    handleConfirmEdit
  } = useInlineEdit()

  return (
    <Box>
      <Text fontSize="sm" fontWeight="semibold" color="text.secondary" px={2} py={2}>
        Conversations
      </Text>

      <VStack spacing={0} align="stretch" role="list" aria-label="Uncategorized conversations">
        {conversations.length === 0 ? (
          <Text fontSize="sm" color="text.tertiary" fontStyle="italic" py={2}>
            No uncategorized conversations
          </Text>
        ) : (
          conversations.map((conversation) => {
            const isCurrentConversation = currentConversationId === conversation.id
            const isConvHovered = hoveredConversation === conversation.id

            return (
              <HStack
                key={conversation.id}
                role="listitem"
                p={2}
                borderRadius="md"
                cursor="pointer"
                bg={isCurrentConversation ? 'primary.50' : 'transparent'}
                borderLeft={isCurrentConversation ? '3px solid' : 'none'}
                borderColor="primary.500"
                transition="all 0.2s"
                _hover={{
                  bg: isCurrentConversation ? 'primary.100' : 'surface.hover'
                }}
                onMouseEnter={() => onConversationHover(conversation.id)}
                onMouseLeave={() => onConversationHover(null)}
                onClick={() => onSelectConversation(conversation.id)}
                justify="space-between"
                align="center"
              >
                {/* Conversation Title */}
                {editingConversationId === conversation.id ? (
                  <HStack flex={1} spacing={1}>
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
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
                          handleConfirmEdit()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          handleCancelEdit()
                        }
                      }}
                      onBlur={handleInputBlur}
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

                {/* Time or Action Icons */}
                <Box minW="60px" display="flex" justifyContent="flex-end" alignItems="center">
                  {editingConversationId === conversation.id ? (
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Confirm rename"
                        icon={<CheckIcon />}
                        size="xs"
                        variant="ghost"
                        color="green.500"
                        _hover={{ bg: 'green.50', color: 'green.600' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConfirmEdit()
                        }}
                      />
                      <IconButton
                        aria-label="Cancel rename"
                        icon={<CloseIcon />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        _hover={{ bg: 'gray.50', color: 'gray.600' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCancelEdit()
                        }}
                      />
                    </HStack>
                  ) : isConvHovered ? (
                    <ConversationMenu
                      conversationId={conversation.id}
                      currentProjectId={null}
                      onRename={() => handleStartEdit(conversation.id, conversation.title)}
                      onDelete={() => onDeleteConversation(conversation.id)}
                    />
                  ) : (
                    <Text fontSize="xs" color="text.tertiary" flexShrink={0}>
                      {formatRelativeTime(conversation.updatedAt)}
                    </Text>
                  )}
                </Box>
              </HStack>
            )
          })
        )}

        {/* Loading indicator */}
        {isLoadingMore && (
          <HStack justify="center" py={4}>
            <Spinner size="sm" color="primary.500" />
            <Text fontSize="sm" color="text.secondary">
              Loading more conversations...
            </Text>
          </HStack>
        )}

        {/* Sentinel element for infinite scroll */}
        {hasMoreConversations && !isLoadingMore && <Box ref={sentinelRef} h="1px" />}
      </VStack>
    </Box>
  )
}

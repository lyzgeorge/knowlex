import React from 'react'
import { Box, HStack, VStack, Text, Spinner } from '@chakra-ui/react'
import { ConversationItem } from '@renderer/components/ui/ConversationItem'
import { useInlineEdit } from '@renderer/hooks/useInlineEdit'

interface ConversationsSectionProps {
  conversations: Array<{
    id: string
    title: string
    updatedAt: string
    projectId?: string | null
  }>
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  isLoadingMore: boolean
  hasMoreConversations: boolean
  sentinelRef: React.RefObject<HTMLDivElement>
}

export const ConversationsSection: React.FC<ConversationsSectionProps> = ({
  conversations,
  currentConversationId,
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
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              editingConversationId={editingConversationId}
              editingTitle={editingTitle}
              setEditingTitle={setEditingTitle}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onConfirmEdit={handleConfirmEdit}
              onInputBlur={handleInputBlur}
              isNested={false}
              currentProjectId={null}
            />
          ))
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

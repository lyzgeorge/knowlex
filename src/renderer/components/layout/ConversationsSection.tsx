import React, { useState, useCallback, useMemo } from 'react'
import { Box, HStack, VStack, Text, Spinner } from '@chakra-ui/react'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import InlineEdit from '@renderer/components/ui/InlineEdit'
import { useConversationStore } from '@renderer/stores/conversation/store'
import { useI18n } from '@renderer/hooks/useI18n'

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
  const { t } = useI18n()
  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle)

  // Ensure conversations are displayed with the most recently updated first.
  // We memoize the sorted list so we don't re-sort on every render unnecessarily.
  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bTime - aTime
    })
  }, [conversations])

  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)

  const startEdit = useCallback((id: string) => {
    setEditingConversationId(id)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingConversationId(null)
  }, [])

  const confirmEdit = useCallback(
    async (id: string, newTitle: string) => {
      await updateConversationTitle(id, newTitle)
      setEditingConversationId(null)
    },
    [updateConversationTitle]
  )

  return (
    <Box>
      <Text fontSize="sm" fontStyle="italic" color="text.secondary" px={2} py={2}>
        {t('sidebar.conversations')}
      </Text>

      <VStack spacing={0} align="stretch" role="list" aria-label="Uncategorized conversations">
        {sortedConversations.length === 0 ? (
          <Text fontSize="sm" color="text.tertiary" fontStyle="italic" py={2}>
            No uncategorized conversations
          </Text>
        ) : (
          sortedConversations.map((conversation) => {
            const isCurrent = currentConversationId === conversation.id
            const isEditing = editingConversationId === conversation.id
            return (
              <HStack
                key={conversation.id}
                role="listitem"
                p={2}
                pl={2}
                borderRadius="md"
                cursor="pointer"
                bg={isCurrent ? 'primary.100' : 'transparent'}
                borderLeft={isCurrent ? '3px solid' : 'none'}
                borderColor="primary.500"
                transition="all 0.2s"
                _hover={{ bg: isCurrent ? 'primary.50' : 'surface.hover' }}
                onClick={() => onSelectConversation(conversation.id)}
                justify="space-between"
                align="center"
              >
                <InlineEdit
                  value={conversation.title}
                  isEditing={isEditing}
                  onStartEdit={() => startEdit(conversation.id)}
                  onCancelEdit={cancelEdit}
                  onConfirmEdit={(newTitle) => confirmEdit(conversation.id, newTitle)}
                  placeholder="Enter conversation title..."
                  tooltipLabel={conversation.title}
                  tooltipPlacement="right"
                />

                {!isEditing && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <ConversationMenu
                      conversationId={conversation.id}
                      currentProjectId={null}
                      onRename={() => startEdit(conversation.id)}
                      onDelete={() => onDeleteConversation(conversation.id)}
                      updatedAt={conversation.updatedAt}
                    />
                  </Box>
                )}
              </HStack>
            )
          })
        )}

        {isLoadingMore && (
          <HStack justify="center" py={4}>
            <Spinner size="sm" color="primary.500" />
            <Text fontSize="sm" color="text.secondary">
              Loading more conversations...
            </Text>
          </HStack>
        )}

        {hasMoreConversations && !isLoadingMore && <Box ref={sentinelRef} h="1px" />}
      </VStack>
    </Box>
  )
}

export default ConversationsSection

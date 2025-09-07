import React, { useState, useCallback, useMemo } from 'react'
import { Box, HStack, VStack, Text, Spinner, Input, IconButton, Tooltip } from '@chakra-ui/react'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import { HiCheck, HiXMark } from 'react-icons/hi2'
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
  const [editingTitle, setEditingTitle] = useState('')

  const startEdit = useCallback((id: string, title: string) => {
    setEditingConversationId(id)
    setEditingTitle(title)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingConversationId(null)
    setEditingTitle('')
  }, [])

  const confirmEdit = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return
    try {
      await updateConversationTitle(editingConversationId, editingTitle.trim())
    } catch (err) {
      console.error('Failed to rename conversation:', err)
    } finally {
      cancelEdit()
    }
  }, [editingConversationId, editingTitle, updateConversationTitle, cancelEdit])

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (editingConversationId) cancelEdit()
    }, 150)
  }, [editingConversationId, cancelEdit])

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
                {isEditing ? (
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
                          confirmEdit()
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelEdit()
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

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  {isEditing ? (
                    <HStack spacing={1}>
                      <IconButton
                        aria-label="Confirm rename"
                        icon={<HiCheck />}
                        size="xs"
                        variant="ghost"
                        color="green.500"
                        _hover={{ bg: 'green.50', color: 'green.600' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          confirmEdit()
                        }}
                      />
                      <IconButton
                        aria-label="Cancel rename"
                        icon={<HiXMark />}
                        size="xs"
                        variant="ghost"
                        color="gray.500"
                        _hover={{ bg: 'gray.50', color: 'gray.600' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation()
                          cancelEdit()
                        }}
                      />
                    </HStack>
                  ) : (
                    <ConversationMenu
                      conversationId={conversation.id}
                      currentProjectId={null}
                      onRename={() => startEdit(conversation.id, conversation.title)}
                      onDelete={() => onDeleteConversation(conversation.id)}
                      updatedAt={conversation.updatedAt}
                    />
                  )}
                </Box>
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

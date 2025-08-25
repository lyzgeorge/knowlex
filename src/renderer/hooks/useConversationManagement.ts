import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useDisclosure } from '@chakra-ui/react'
import { useConversationStore } from '@renderer/stores/conversation'
import { useNavigationActions } from '@renderer/stores/navigation'
import { useNotifications } from '@renderer/components/ui'

export function useConversationManagement() {
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const cancelRef = useRef<HTMLButtonElement>(null)

  const {
    conversations,
    messages,
    currentConversationId,
    setCurrentConversation,
    deleteConversation,
    loadMoreConversations,
    hasMoreConversations,
    isLoadingMore
  } = useConversationStore()

  const { navigateToChat } = useNavigationActions()
  const notifications = useNotifications()

  // Ref for infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll logic
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMoreConversations || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          loadMoreConversations()
        }
      },
      {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.unobserve(sentinel)
    }
  }, [hasMoreConversations, isLoadingMore, loadMoreConversations])

  const handleNewChat = useCallback(() => {
    setCurrentConversation(null)
  }, [setCurrentConversation])

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      setCurrentConversation(conversationId)
      navigateToChat()
    },
    [setCurrentConversation, navigateToChat]
  )

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      setDeleteConversationId(conversationId)
      onDeleteOpen()
    },
    [onDeleteOpen]
  )

  const confirmDelete = useCallback(async () => {
    if (!deleteConversationId) return

    setIsDeleting(true)
    try {
      await deleteConversation(deleteConversationId)
      notifications.conversationDeleted()
      onDeleteClose()
    } catch (error) {
      notifications.conversationDeleteFailed(
        error instanceof Error ? error.message : 'An error occurred'
      )
    } finally {
      setIsDeleting(false)
    }
  }, [deleteConversationId, deleteConversation, notifications, onDeleteClose])

  // Memoize filtered conversations
  const filteredConversations = useMemo(
    () =>
      conversations
        .filter((conv) => {
          const conversationMessages = messages[conv.id] || []
          return conversationMessages.length >= 1
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [conversations, messages]
  )

  const uncategorizedConversations = useMemo(
    () => filteredConversations.filter((conv) => !conv.projectId),
    [filteredConversations]
  )

  return {
    // Conversation data
    conversations: filteredConversations,
    uncategorizedConversations,
    currentConversationId,

    // UI state
    hoveredConversation,
    setHoveredConversation,

    // Actions
    handleNewChat,
    handleSelectConversation,

    // Delete functionality
    handleDeleteConversation,
    confirmDelete,
    isDeleteOpen,
    onDeleteClose,
    cancelRef,
    isDeleting,

    // Infinite scroll
    sentinelRef,
    hasMoreConversations,
    isLoadingMore
  }
}

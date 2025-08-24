import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tooltip,
  Spinner
} from '@chakra-ui/react'
import {
  AddIcon,
  SearchIcon,
  SettingsIcon,
  HamburgerIcon,
  CheckIcon,
  CloseIcon
} from '@chakra-ui/icons'
import { Button } from '../ui/Button'
import { useConversationStore } from '../../stores/conversation'
import { formatRelativeTime } from '../../../../shared/utils/time'
import { useNotifications } from '../ui'

export interface SidebarProps {
  className?: string
}

/**
 * 侧边栏导航组件 - Task 16
 *
 * 实现要求:
 * - 固定280px宽度，Logo显示，"+ New Chat"按钮
 * - 项目列表：可展开/折叠，文件夹图标，项目名称显示
 * - 会话列表：对话气泡图标，会话标题，时间戳显示
 * - 悬浮操作：项目操作图标（文件管理、复制、更多），会话操作菜单
 * - 虚拟滚动优化和键盘导航支持
 */
export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  // Local state for UI interactions
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)

  // Inline editing state
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  // Delete confirmation state
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  // Zustand stores
  const conversations = useConversationStore((state) => state.conversations)
  const messages = useConversationStore((state) => state.messages)
  const deleteConversation = useConversationStore((state) => state.deleteConversation)
  const updateConversationTitle = useConversationStore((state) => state.updateConversationTitle)
  const currentConversationId = useConversationStore((state) => state.currentConversationId)
  const setCurrentConversation = useConversationStore((state) => state.setCurrentConversation)
  const loadMoreConversations = useConversationStore((state) => state.loadMoreConversations)
  const hasMoreConversations = useConversationStore((state) => state.hasMoreConversations)
  const isLoadingMore = useConversationStore((state) => state.isLoadingMore)

  // Notifications
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

  // Handle new chat creation (just clear current conversation, don't create new one yet)
  const handleNewChat = useCallback(() => {
    // Just clear current conversation - new one will be created when user sends first message
    setCurrentConversation(null)
  }, [setCurrentConversation])

  // Handle inline editing
  const handleStartInlineEdit = useCallback((conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId)
    setEditingTitle(currentTitle)
  }, [])

  const handleCancelInlineEdit = useCallback(() => {
    setEditingConversationId(null)
    setEditingTitle('')
  }, [])

  const handleInputBlur = useCallback(() => {
    // Add a small delay to allow clicking confirm button
    setTimeout(() => {
      if (editingConversationId) {
        handleCancelInlineEdit()
      }
    }, 150)
  }, [editingConversationId, handleCancelInlineEdit])

  const handleConfirmInlineEdit = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return

    console.log('Updating conversation title:', {
      conversationId: editingConversationId,
      newTitle: editingTitle.trim()
    })

    try {
      await updateConversationTitle(editingConversationId, editingTitle.trim())
      console.log('Conversation title updated successfully')
      notifications.conversationRenamed()
      setEditingConversationId(null)
      setEditingTitle('')
    } catch (error) {
      console.error('Failed to update conversation title:', error)
      notifications.conversationRenameFailed(
        error instanceof Error ? error.message : 'An error occurred'
      )
    }
  }, [editingConversationId, editingTitle, updateConversationTitle, notifications])

  // Handle conversation delete
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

  // Handle global search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // TODO: Implement global search functionality
    console.log('Searching for:', query)
  }

  // Keyboard navigation support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle common keyboard shortcuts
      switch (e.key) {
        case 'n':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleNewChat()
          }
          break
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            // Focus search input
            const searchInput = document.querySelector(
              '[placeholder="Global Search"]'
            ) as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
            }
          }
          break
        case 'Escape':
          // Clear search when escape is pressed in search box
          if (e.target instanceof HTMLInputElement && e.target.placeholder === 'Global Search') {
            setSearchQuery('')
            e.target.blur()
          }
          break
      }
    },
    [handleNewChat]
  )

  // Memoize conversation filtering to prevent re-renders
  // Show conversations that have at least 1 message (don't show empty conversations)
  const allConversations = useMemo(
    () =>
      conversations
        .filter((conv) => {
          const conversationMessages = messages[conv.id] || []
          // Only show conversations with at least 1 message (don't show empty conversations)
          return conversationMessages.length >= 1
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), // Sort by last modified (newest first)
    [conversations, messages]
  )

  return (
    <Box
      w="280px"
      h="100vh"
      bg="surface.primary"
      borderRight="1px solid"
      borderColor="border.primary"
      display="flex"
      flexDirection="column"
      className={className}
      position="relative"
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Main navigation sidebar"
      tabIndex={-1}
    >
      {/* Draggable Top Area */}
      <Box
        h="2rem"
        w="100%"
        position="absolute"
        top={0}
        left={0}
        zIndex={1000}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        bg="transparent"
        pointerEvents="all"
      />
      {/* Top Section: Logo and New Chat */}
      <Box p={4} pt="2rem">
        <VStack spacing={4} align="stretch">
          {/* Logo */}
          <Text fontSize="xl" fontWeight="bold" color="text.primary">
            Knowlex
          </Text>

          {/* New Chat Button */}
          <Button
            leftIcon={<AddIcon />}
            variant="solid"
            bg="primary.500"
            color="white"
            _hover={{ bg: 'primary.600' }}
            _active={{ bg: 'primary.700' }}
            size="sm"
            isFullWidth
            justifyContent="flex-start"
            onClick={handleNewChat}
            aria-label="Create new chat conversation (Ctrl/Cmd+N)"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            New Chat
          </Button>

          {/* Global Search */}
          <InputGroup size="sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <InputLeftElement>
              <SearchIcon color="text.secondary" />
            </InputLeftElement>
            <Input
              placeholder="Global Search"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              bg="surface.secondary"
              border="1px solid"
              borderColor="border.secondary"
              _focus={{
                borderColor: 'primary.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)'
              }}
              aria-label="Search across all conversations (Ctrl/Cmd+K)"
            />
          </InputGroup>
        </VStack>
      </Box>

      <Divider />

      {/* Main Content Area - Scrollable */}
      <Box flex={1} overflowY="auto" px={4} py={3}>
        <VStack spacing={6} align="stretch">
          {/* Conversations Section */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="text.secondary" mb={3}>
              Conversations
            </Text>

            <VStack spacing={0} align="stretch" role="list" aria-label="All conversations">
              {allConversations.length === 0 ? (
                <Text fontSize="sm" color="text.tertiary" fontStyle="italic" py={2}>
                  No conversations yet
                </Text>
              ) : (
                allConversations.map((conversation) => {
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
                      onMouseEnter={() => setHoveredConversation(conversation.id)}
                      onMouseLeave={() => setHoveredConversation(null)}
                      onClick={() => setCurrentConversation(conversation.id)}
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
                                handleConfirmInlineEdit()
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelInlineEdit()
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
                          <Text
                            fontSize="sm"
                            fontWeight="medium"
                            noOfLines={1}
                            flex={1}
                            py={0.5}
                            minW={0}
                          >
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
                                handleConfirmInlineEdit()
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
                                handleCancelInlineEdit()
                              }}
                            />
                          </HStack>
                        ) : isConvHovered ? (
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Conversation options"
                              icon={<HamburgerIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <MenuList>
                              <MenuItem
                                onClick={() =>
                                  handleStartInlineEdit(conversation.id, conversation.title)
                                }
                              >
                                Rename
                              </MenuItem>
                              <MenuItem
                                color="red.500"
                                onClick={() => handleDeleteConversation(conversation.id)}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
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
        </VStack>
      </Box>

      <Divider />

      {/* Bottom Section: User Profile and Settings */}
      <Box p={4}>
        <HStack spacing={3}>
          <Avatar size="sm" name="User Name" />
          <VStack align="start" spacing={0} flex={1} minW={0}>
            <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
              用户名
            </Text>
          </VStack>
          <IconButton
            aria-label="Settings"
            icon={<SettingsIcon />}
            size="sm"
            variant="ghost"
            onClick={() => {
              console.log('Open settings')
            }}
          />
        </HStack>
      </Box>

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Conversation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={isDeleting}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default Sidebar

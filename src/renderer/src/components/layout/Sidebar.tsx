import React, { useState, useCallback, useMemo } from 'react'
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
  Collapse,
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
  useToast,
  Tooltip
} from '@chakra-ui/react'
import { Modal } from '../ui/Modal'
import {
  AddIcon,
  SearchIcon,
  SettingsIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CopyIcon,
  HamburgerIcon
} from '@chakra-ui/icons'
import { Button } from '../ui/Button'
import { useProjectStore } from '../../stores/project'
import { useConversationStore } from '../../stores/conversation'
import { formatRelativeTime } from '../../utils/time'

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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)

  // Rename modal state
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null)
  const [newConversationTitle, setNewConversationTitle] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const { isOpen: isRenameOpen, onOpen: onRenameOpen, onClose: onRenameClose } = useDisclosure()

  // Delete confirmation state
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  // Zustand stores
  const projects = useProjectStore((state) => state.projects)
  const conversations = useConversationStore((state) => state.conversations)
  const messages = useConversationStore((state) => state.messages)
  const startNewChat = useConversationStore((state) => state.startNewChat)
  const deleteConversation = useConversationStore((state) => state.deleteConversation)
  const updateConversationTitle = useConversationStore((state) => state.updateConversationTitle)
  const currentConversationId = useConversationStore((state) => state.currentConversationId)
  const setCurrentConversation = useConversationStore((state) => state.setCurrentConversation)

  // Toast for notifications
  const toast = useToast()

  // Toggle project expansion
  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }

  // Handle new chat creation
  const handleNewChat = useCallback(() => {
    startNewChat()
  }, [startNewChat])

  // Handle conversation rename
  const handleRenameConversation = useCallback(
    (conversationId: string, currentTitle: string) => {
      setRenameConversationId(conversationId)
      setNewConversationTitle(currentTitle)
      onRenameOpen()
    },
    [onRenameOpen]
  )

  const confirmRename = useCallback(async () => {
    if (!renameConversationId || !newConversationTitle.trim()) return

    setIsRenaming(true)
    try {
      await updateConversationTitle(renameConversationId, newConversationTitle.trim())
      toast({
        title: 'Conversation renamed',
        status: 'success',
        duration: 2000,
        isClosable: true
      })
      onRenameClose()
    } catch (error) {
      toast({
        title: 'Failed to rename conversation',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    } finally {
      setIsRenaming(false)
    }
  }, [renameConversationId, newConversationTitle, updateConversationTitle, toast, onRenameClose])

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
      toast({
        title: 'Conversation deleted',
        status: 'success',
        duration: 2000,
        isClosable: true
      })
      onDeleteClose()
    } catch (error) {
      toast({
        title: 'Failed to delete conversation',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    } finally {
      setIsDeleting(false)
    }
  }, [deleteConversationId, deleteConversation, toast, onDeleteClose])

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
  // Only show conversations that have at least 2 messages (user + AI response)
  const unclassifiedConversations = useMemo(
    () =>
      conversations
        .filter((conv) => {
          if (conv.projectId) return false // Only unclassified conversations
          const conversationMessages = messages[conv.id] || []
          return conversationMessages.length >= 2 // Must have at least user + AI message
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), // Sort by last modified (newest first)
    [conversations, messages]
  )

  const projectConversationsMap = useMemo(() => {
    const map = new Map<string, typeof conversations>()
    conversations.forEach((conv) => {
      if (conv.projectId) {
        const conversationMessages = messages[conv.id] || []
        // Only include conversations with at least 2 messages (user + AI response)
        if (conversationMessages.length >= 2) {
          if (!map.has(conv.projectId)) {
            map.set(conv.projectId, [])
          }
          map.get(conv.projectId)!.push(conv)
        }
      }
    })
    // Sort conversations within each project by last modified (newest first)
    map.forEach((convs, _projectId) => {
      convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    })
    return map
  }, [conversations, messages])

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
        style={{ WebkitAppRegion: 'drag' }}
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
            colorScheme="green"
            size="sm"
            isFullWidth
            justifyContent="flex-start"
            onClick={handleNewChat}
            aria-label="Create new chat conversation (Ctrl/Cmd+N)"
            style={{ WebkitAppRegion: 'no-drag' }}
          >
            New Chat
          </Button>

          {/* Global Search */}
          <InputGroup size="sm" style={{ WebkitAppRegion: 'no-drag' }}>
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
              aria-label="Search across all conversations and projects (Ctrl/Cmd+K)"
            />
          </InputGroup>
        </VStack>
      </Box>

      <Divider />

      {/* Main Content Area - Scrollable */}
      <Box flex={1} overflowY="auto" px={4} py={3}>
        <VStack spacing={6} align="stretch">
          {/* Projects Section */}
          <Box>
            <HStack justify="space-between" mb={3}>
              <Text fontSize="sm" fontWeight="semibold" color="text.secondary">
                Projects
              </Text>
              <IconButton
                aria-label="Add project"
                icon={<AddIcon />}
                size="xs"
                variant="ghost"
                onClick={() => {
                  // TODO: Open create project dialog
                  console.log('Create new project')
                }}
              />
            </HStack>

            <VStack spacing={1} align="stretch" role="list" aria-label="Projects list">
              {projects.length === 0 ? (
                <Text fontSize="sm" color="text.tertiary" fontStyle="italic" py={2}>
                  No projects yet
                </Text>
              ) : (
                projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.id)
                  const projectConversations = projectConversationsMap.get(project.id) || []
                  const isHovered = hoveredProject === project.id

                  return (
                    <Box key={project.id} role="listitem">
                      {/* Project Row */}
                      <HStack
                        p={2}
                        borderRadius="md"
                        cursor="pointer"
                        _hover={{ bg: 'surface.hover' }}
                        onMouseEnter={() => setHoveredProject(project.id)}
                        onMouseLeave={() => setHoveredProject(null)}
                        onClick={() => toggleProjectExpansion(project.id)}
                      >
                        {/* Expand/Collapse Icon */}
                        <IconButton
                          aria-label={isExpanded ? 'Collapse project' : 'Expand project'}
                          icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleProjectExpansion(project.id)
                          }}
                        />

                        {/* Project Folder Icon */}
                        <SearchIcon color="text.secondary" boxSize={4} />

                        {/* Project Name */}
                        <Text fontSize="sm" fontWeight="medium" flex={1} noOfLines={1} ml={2}>
                          {project.name}
                        </Text>

                        {/* Project Actions - Show on Hover */}
                        {isHovered && (
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="File management"
                              icon={<SearchIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Open file management for project:', project.id)
                              }}
                            />
                            <IconButton
                              aria-label="Copy project"
                              icon={<CopyIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Copy project:', project.id)
                              }}
                            />
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                aria-label="More options"
                                icon={<HamburgerIcon />}
                                size="xs"
                                variant="ghost"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <MenuList>
                                <MenuItem>Duplicate Project</MenuItem>
                                <MenuItem>Rename</MenuItem>
                                <MenuItem>Settings</MenuItem>
                                <MenuItem color="red.500">Delete</MenuItem>
                              </MenuList>
                            </Menu>
                          </HStack>
                        )}
                      </HStack>

                      {/* Project Conversations */}
                      <Collapse in={isExpanded}>
                        <Box ml={6} mt={1}>
                          {projectConversations.length === 0 ? (
                            <Text fontSize="xs" color="text.tertiary" py={1}>
                              No conversations yet
                            </Text>
                          ) : (
                            <VStack
                              spacing={0.5}
                              align="stretch"
                              role="list"
                              aria-label={`Conversations in ${project.name}`}
                            >
                              {projectConversations.map((conversation) => {
                                const isCurrentConversation =
                                  currentConversationId === conversation.id
                                const isConvHovered = hoveredConversation === conversation.id

                                return (
                                  <HStack
                                    key={conversation.id}
                                    role="listitem"
                                    p={2}
                                    borderRadius="sm"
                                    cursor="pointer"
                                    bg={isCurrentConversation ? 'primary.50' : 'transparent'}
                                    borderLeft={isCurrentConversation ? '3px solid' : 'none'}
                                    borderColor="primary.500"
                                    shadow="0 4px 8px transparent"
                                    transition="all 0.2s"
                                    _hover={{
                                      bg: isCurrentConversation ? 'primary.100' : 'surface.hover',
                                      shadow: 'button-hover'
                                    }}
                                    onMouseEnter={() => setHoveredConversation(conversation.id)}
                                    onMouseLeave={() => setHoveredConversation(null)}
                                    onClick={() => setCurrentConversation(conversation.id)}
                                    justify="space-between"
                                    align="center"
                                  >
                                    {/* Conversation Title */}
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
                                      fontSize="xs"
                                      fontWeight="medium"
                                      px={3}
                                      py={2}
                                      maxW="240px"
                                      textAlign="left"
                                      whiteSpace="normal"
                                    >
                                      <Text
                                        fontSize="xs"
                                        fontWeight="medium"
                                        noOfLines={1}
                                        flex={1}
                                        minW={0}
                                      >
                                        {conversation.title}
                                      </Text>
                                    </Tooltip>

                                    {/* Time or Menu Icon */}
                                    <Box minW="60px" display="flex" justifyContent="flex-end">
                                      {isConvHovered ? (
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
                                            <MenuItem>Move to Project</MenuItem>
                                            <MenuItem>Remove from Project</MenuItem>
                                            <MenuItem
                                              onClick={() =>
                                                handleRenameConversation(
                                                  conversation.id,
                                                  conversation.title
                                                )
                                              }
                                            >
                                              Rename
                                            </MenuItem>
                                            <MenuItem
                                              color="red.500"
                                              onClick={() =>
                                                handleDeleteConversation(conversation.id)
                                              }
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
                              })}
                            </VStack>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  )
                })
              )}
            </VStack>
          </Box>

          {/* Unclassified Chats Section */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="text.secondary" mb={3}>
              Chats (未归类聊天)
            </Text>

            <VStack spacing={0} align="stretch" role="list" aria-label="Unclassified conversations">
              {unclassifiedConversations.length === 0 ? (
                <Text fontSize="sm" color="text.tertiary" fontStyle="italic" py={2}>
                  No conversations yet
                </Text>
              ) : (
                unclassifiedConversations.map((conversation) => {
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
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1} flex={1} minW={0}>
                          {conversation.title}
                        </Text>
                      </Tooltip>

                      {/* Time or Menu Icon */}
                      <Box minW="60px" display="flex" justifyContent="flex-end" alignItems="center">
                        {isConvHovered ? (
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="Conversation options"
                              icon={<HamburgerIcon />}
                              size="xs"
                              variant="ghost"
                              p={1}
                              w="21px"
                              h="21px"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <MenuList>
                              <MenuItem>Move to Project</MenuItem>
                              <MenuItem
                                onClick={() =>
                                  handleRenameConversation(conversation.id, conversation.title)
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

      {/* Rename Conversation Modal */}
      <Modal
        isOpen={isRenameOpen}
        onClose={onRenameClose}
        title="Rename Conversation"
        size="md"
        footer={
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onRenameClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={confirmRename}
              isLoading={isRenaming}
              isDisabled={!newConversationTitle.trim()}
            >
              Rename
            </Button>
          </HStack>
        }
      >
        <Input
          value={newConversationTitle}
          onChange={(e) => setNewConversationTitle(e.target.value)}
          placeholder="Enter new conversation title"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              confirmRename()
            }
          }}
        />
      </Modal>

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

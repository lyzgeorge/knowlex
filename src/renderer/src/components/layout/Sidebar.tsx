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
  Divider
} from '@chakra-ui/react'
import {
  AddIcon,
  SearchIcon,
  SettingsIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@chakra-ui/icons'
import { Button } from '../ui/Button'
import { useProjectStore } from '../../stores/project'
import { useConversationStore } from '../../stores/conversation'
import { formatRelativeTime } from '../../utils/time'

export interface SidebarProps {
  className?: string
}

/**
 * Left sidebar navigation component for Knowlex Desktop Application
 *
 * Features:
 * - Fixed 280px width layout
 * - Logo and New Chat button
 * - Global search functionality
 * - Expandable projects list with conversations
 * - Unclassified chats section
 * - User profile and settings at bottom
 * - Hover actions for projects and conversations
 * - Keyboard navigation support
 */
export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  // Local state for UI interactions
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  const [hoveredConversation, setHoveredConversation] = useState<string | null>(null)

  // Zustand stores
  const projects = useProjectStore((state) => state.projects)
  const conversations = useConversationStore((state) => state.conversations)
  const createConversation = useConversationStore((state) => state.createConversation)
  const currentConversationId = useConversationStore((state) => state.currentConversationId)
  const setCurrentConversation = useConversationStore((state) => state.setCurrentConversation)

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
  const handleNewChat = useCallback(async () => {
    try {
      await createConversation()
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }, [createConversation])

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
  const unclassifiedConversations = useMemo(
    () => conversations.filter((conv) => !conv.projectId),
    [conversations]
  )

  const projectConversationsMap = useMemo(() => {
    const map = new Map<string, typeof conversations>()
    conversations.forEach((conv) => {
      if (conv.projectId) {
        if (!map.has(conv.projectId)) {
          map.set(conv.projectId, [])
        }
        map.get(conv.projectId)!.push(conv)
      }
    })
    return map
  }, [conversations])

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
      {/* Top Section: Logo and New Chat */}
      <Box p={4}>
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
            onClick={handleNewChat}
            aria-label="Create new chat conversation (Ctrl/Cmd+N)"
          >
            New Chat
          </Button>

          {/* Global Search */}
          <InputGroup size="sm">
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

                        {/* Project Name */}
                        <Text fontSize="sm" fontWeight="medium" flex={1} noOfLines={1}>
                          {project.name}
                        </Text>

                        {/* Project Actions - Show on Hover */}
                        {isHovered && (
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="File management"
                              icon={<SearchIcon />} // Placeholder - will use proper file icon
                              size="xs"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Open file management for project:', project.id)
                              }}
                            />
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                aria-label="More options"
                                icon={<SettingsIcon />} // Placeholder - will use ellipsis icon
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
                                    _hover={{
                                      bg: isCurrentConversation ? 'primary.100' : 'surface.hover'
                                    }}
                                    onMouseEnter={() => setHoveredConversation(conversation.id)}
                                    onMouseLeave={() => setHoveredConversation(null)}
                                    onClick={() => setCurrentConversation(conversation.id)}
                                  >
                                    {/* Conversation Title */}
                                    <VStack align="start" spacing={0} flex={1} minW={0}>
                                      <Text fontSize="xs" fontWeight="medium" noOfLines={1}>
                                        {conversation.title}
                                      </Text>
                                      <Text fontSize="xs" color="text.tertiary">
                                        {formatRelativeTime(conversation.updatedAt)}
                                      </Text>
                                    </VStack>

                                    {/* Conversation Actions */}
                                    {isConvHovered && (
                                      <Menu>
                                        <MenuButton
                                          as={IconButton}
                                          aria-label="Conversation options"
                                          icon={<SettingsIcon />} // Placeholder for ellipsis
                                          size="xs"
                                          variant="ghost"
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <MenuList>
                                          <MenuItem>Move to Project</MenuItem>
                                          <MenuItem>Remove from Project</MenuItem>
                                          <MenuItem>Rename</MenuItem>
                                          <MenuItem color="red.500">Delete</MenuItem>
                                        </MenuList>
                                      </Menu>
                                    )}
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

            <VStack
              spacing={0.5}
              align="stretch"
              role="list"
              aria-label="Unclassified conversations"
            >
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
                      _hover={{ bg: isCurrentConversation ? 'primary.100' : 'surface.hover' }}
                      onMouseEnter={() => setHoveredConversation(conversation.id)}
                      onMouseLeave={() => setHoveredConversation(null)}
                      onClick={() => setCurrentConversation(conversation.id)}
                    >
                      {/* Conversation Details */}
                      <VStack align="start" spacing={0} flex={1} minW={0}>
                        <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                          {conversation.title}
                        </Text>
                        <Text fontSize="xs" color="text.tertiary">
                          {formatRelativeTime(conversation.updatedAt)}
                        </Text>
                      </VStack>

                      {/* Conversation Actions */}
                      {isConvHovered && (
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="Conversation options"
                            icon={<SettingsIcon />} // Placeholder for ellipsis
                            size="xs"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <MenuList>
                            <MenuItem>Move to Project</MenuItem>
                            <MenuItem>Rename</MenuItem>
                            <MenuItem color="red.500">Delete</MenuItem>
                          </MenuList>
                        </Menu>
                      )}
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
    </Box>
  )
}

export default Sidebar

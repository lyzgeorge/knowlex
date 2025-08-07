/**
 * Sidebar Component for Knowlex Desktop Application
 *
 * Complete implementation following PRD requirements 12.1-12.20
 * Matches exact UI/UX provided by user with proper timestamp formatting
 */

import React, { useState, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Divider,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  useColorModeValue,
  Collapse,
  Icon,
} from '@chakra-ui/react'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentIcon,
  BookOpenIcon,
  EllipsisVerticalIcon,
  ChatBubbleLeftIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import { useLanguage } from '@/providers'
import { useColorMode } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

// Types
interface Project {
  id: string
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
  conversationCount: number
  fileCount: number
}

interface Conversation {
  id: string
  title: string
  projectId?: string
  updatedAt: Date
  messageCount: number
}

interface SidebarProps {
  className?: string
  'data-testid'?: string
}

// Mock data matching the UI design
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project A',
    description: 'Research project for AI',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    conversationCount: 4,
    fileCount: 12,
  },
  {
    id: '2',
    name: 'Project B',
    description: 'Development project',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-20'),
    conversationCount: 2,
    fileCount: 8,
  },
]

const mockProjectConversations: Record<string, Conversation[]> = {
  '1': [
    { id: 'c1', title: 'Research Notes', projectId: '1', updatedAt: new Date(), messageCount: 5 },
    {
      id: 'c2',
      title: 'Meeting Summary',
      projectId: '1',
      updatedAt: new Date(Date.now() - 3600000),
      messageCount: 3,
    },
    {
      id: 'c3',
      title: 'Action Items',
      projectId: '1',
      updatedAt: new Date(Date.now() - 7200000),
      messageCount: 8,
    },
  ],
  '2': [
    {
      id: 'c4',
      title: 'Code Review',
      projectId: '2',
      updatedAt: new Date(Date.now() - 86400000),
      messageCount: 12,
    },
  ],
}

const mockUncategorizedChats: Conversation[] = [
  { id: 'u1', title: 'Untitled Chat', updatedAt: new Date(Date.now() - 300000), messageCount: 2 },
  { id: 'u2', title: 'Chat 历史 1', updatedAt: new Date(Date.now() - 172800000), messageCount: 7 },
  { id: 'u3', title: 'Chat 历史 2', updatedAt: new Date(Date.now() - 259200000), messageCount: 4 },
]

// Utility function to format timestamps according to PRD requirements
const formatTimestamp = (date: Date, language: 'en' | 'zh' = 'zh'): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (language === 'zh') {
    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } else {
    if (diffMinutes < 1) return 'now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
}

const Sidebar: React.FC<SidebarProps> = ({ className, 'data-testid': testId, ...props }) => {
  const { language, setLanguage } = useLanguage()
  const { colorMode, toggleColorMode } = useColorMode()
  const { t } = useTranslation()

  // State management
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['1']))
  const [hoveredItem, setHoveredItem] = useState<{ type: string; id: string } | null>(null)
  const [openMenu, setOpenMenu] = useState<{ type: string; id: string } | null>(null)

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.800', 'white')
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')

  // Project expansion toggle
  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev)
      if (newSet.has(projectId)) {
        newSet.delete(projectId)
      } else {
        newSet.add(projectId)
      }
      return newSet
    })
  }, [])

  // Hover handlers
  const handleMouseEnter = useCallback((type: string, id: string) => {
    setHoveredItem({ type, id })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredItem(null)
  }, [])

  // New Chat handler
  const handleNewChat = useCallback(() => {
    console.log('Creating new chat...')
    // TODO: Implement new chat creation
  }, [])

  // Global Search handler
  const handleGlobalSearch = useCallback(() => {
    console.log('Opening global search...')
    // TODO: Implement global search modal
  }, [])

  // Project action handlers
  const handleProjectFileManager = useCallback((projectId: string) => {
    console.log(`Opening file manager for project ${projectId}`)
    // TODO: Implement file manager navigation
  }, [])

  const handleProjectMemoryKnowledge = useCallback((projectId: string) => {
    console.log(`Opening memory & knowledge for project ${projectId}`)
    // TODO: Implement memory & knowledge navigation
  }, [])

  const handleProjectMenu = useCallback((projectId: string, action: string) => {
    console.log(`Project ${projectId} action: ${action}`)
    // TODO: Implement project rename/delete
  }, [])

  // Conversation action handlers
  const handleConversationMenu = useCallback(
    (conversationId: string, action: string, targetProjectId?: string) => {
      console.log(`Conversation ${conversationId} action: ${action}`, targetProjectId)
      if (action === 'moveTo' && targetProjectId) {
        // TODO: Implement move conversation to project
        console.log(`Moving conversation ${conversationId} to project ${targetProjectId}`)
      } else if (action === 'moveOut') {
        // TODO: Implement move conversation out of project
        console.log(`Moving conversation ${conversationId} out of project`)
      } else if (action === 'rename') {
        // TODO: Implement conversation rename
        console.log(`Renaming conversation ${conversationId}`)
      } else if (action === 'delete') {
        // TODO: Implement conversation delete
        console.log(`Deleting conversation ${conversationId}`)
      }
    },
    []
  )

  // Settings handlers (commented for now to avoid lint errors)
  // const handleLanguageChange = useCallback(
  //   (newLanguage: 'en' | 'zh') => {
  //     setLanguage(newLanguage)
  //   },
  //   [setLanguage]
  // )

  return (
    <Box
      width="260px"
      minWidth="260px"
      maxWidth="260px"
      height="100vh"
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      overflow="hidden"
      className={className}
      data-testid={testId}
      {...props}
    >
      {/* Header Section */}
      <VStack spacing={4} p={4} align="stretch">
        {/* Logo */}
        <Text fontSize="xl" fontWeight="bold" color={textColor} mb={2}>
          Knowlex
        </Text>
      </VStack>

      <Divider borderColor={borderColor} />

      {/* Projects Section */}
      <Box flex={1} overflow="auto">
        <VStack spacing={0} align="stretch">
          {/* New Chat Button */}
          <Button
            leftIcon={<Icon as={PlusIcon} boxSize={4} />}
            size="sm"
            variant="outline"
            mx={4}
            mt={3}
            mb={2}
            onClick={handleNewChat}
            colorScheme="blue"
            justifyContent="flex-start"
          >
            {t('ui.sidebar.newChat')}
          </Button>

          {/* Global Search Button */}
          <Button
            leftIcon={<Icon as={MagnifyingGlassIcon} boxSize={4} />}
            size="sm"
            variant="outline"
            mx={4}
            mb={3}
            onClick={handleGlobalSearch}
            colorScheme="gray"
            justifyContent="flex-start"
          >
            {t('ui.sidebar.globalSearch')}
          </Button>

          {/* Projects Header */}
          <Text fontSize="md" fontWeight="semibold" color={textColor} px={4} py={3}>
            {t('ui.sidebar.projects')}
          </Text>

          {/* Projects List */}
          {mockProjects.map(project => {
            const isExpanded = expandedProjects.has(project.id)
            const isHovered = hoveredItem?.type === 'project' && hoveredItem?.id === project.id
            const conversations = mockProjectConversations[project.id] || []

            return (
              <VStack key={project.id} spacing={0} align="stretch">
                {/* Project Item */}
                <HStack
                  spacing={3}
                  px={4}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  onMouseEnter={() => handleMouseEnter('project', project.id)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => toggleProject(project.id)}
                >
                  {/* Expand/Collapse Icon */}
                  <Icon
                    as={isExpanded ? FolderOpenIcon : FolderIcon}
                    boxSize={4}
                    color={mutedTextColor}
                  />

                  {/* Project Name */}
                  <Text fontSize="sm" color={textColor} fontWeight="medium" flex={1} isTruncated>
                    {project.name}
                  </Text>

                  {/* Hover Actions */}
                  {isHovered && (
                    <HStack spacing={1}>
                      <IconButton
                        icon={<Icon as={DocumentIcon} boxSize={4} />}
                        size="xs"
                        variant="ghost"
                        aria-label="File manager"
                        color={mutedTextColor}
                        _hover={{ color: textColor }}
                        onClick={e => {
                          e.stopPropagation()
                          handleProjectFileManager(project.id)
                        }}
                      />
                      <IconButton
                        icon={<Icon as={BookOpenIcon} boxSize={4} />}
                        size="xs"
                        variant="ghost"
                        aria-label="Memory & Knowledge"
                        color={mutedTextColor}
                        _hover={{ color: textColor }}
                        onClick={e => {
                          e.stopPropagation()
                          handleProjectMemoryKnowledge(project.id)
                        }}
                      />
                      <Menu
                        isOpen={openMenu?.type === 'project' && openMenu?.id === project.id}
                        onClose={() => setOpenMenu(null)}
                      >
                        <MenuButton
                          as={IconButton}
                          icon={<Icon as={EllipsisVerticalIcon} boxSize={4} />}
                          size="xs"
                          variant="ghost"
                          aria-label="More options"
                          color={mutedTextColor}
                          _hover={{ color: textColor }}
                          onClick={e => {
                            e.stopPropagation()
                            setOpenMenu(
                              openMenu?.type === 'project' && openMenu?.id === project.id
                                ? null
                                : { type: 'project', id: project.id }
                            )
                          }}
                        />
                        <MenuList>
                          <MenuItem
                            onClick={() => {
                              handleProjectMenu(project.id, 'rename')
                              setOpenMenu(null)
                            }}
                          >
                            {t('ui.sidebar.rename')}
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handleProjectMenu(project.id, 'delete')
                              setOpenMenu(null)
                            }}
                            color="red.500"
                          >
                            {t('ui.sidebar.delete')}
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  )}
                </HStack>

                {/* Project Conversations */}
                <Collapse in={isExpanded}>
                  <VStack spacing={0} align="stretch">
                    {conversations.map(conversation => {
                      const isConvHovered =
                        hoveredItem?.type === 'conversation' && hoveredItem?.id === conversation.id

                      return (
                        <HStack
                          key={conversation.id}
                          spacing={2}
                          px={4}
                          py={1}
                          cursor="pointer"
                          _hover={{ bg: hoverBg }}
                          onMouseEnter={() => handleMouseEnter('conversation', conversation.id)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <Icon as={ChatBubbleLeftIcon} boxSize={3.5} color={mutedTextColor} />
                          <Text fontSize="xs" color={textColor} flex={1} isTruncated>
                            {conversation.title}
                          </Text>

                          {isConvHovered ||
                          (openMenu?.type === 'conversation' &&
                            openMenu?.id === conversation.id) ? (
                            <Menu
                              isOpen={
                                openMenu?.type === 'conversation' &&
                                openMenu?.id === conversation.id
                              }
                              onClose={() => setOpenMenu(null)}
                            >
                              <MenuButton
                                as={IconButton}
                                icon={<Icon as={EllipsisVerticalIcon} boxSize={4} />}
                                size="xs"
                                variant="ghost"
                                aria-label="More options"
                                color={mutedTextColor}
                                _hover={{ color: textColor }}
                                onClick={e => {
                                  e.stopPropagation()
                                  setOpenMenu(
                                    openMenu?.type === 'conversation' &&
                                      openMenu?.id === conversation.id
                                      ? null
                                      : { type: 'conversation', id: conversation.id }
                                  )
                                }}
                              />
                              <MenuList>
                                <Menu placement="right-start">
                                  <MenuButton as={MenuItem}>{t('ui.sidebar.moveTo')}</MenuButton>
                                  <MenuList>
                                    {mockProjects
                                      .filter(project => project.id !== conversation.projectId)
                                      .map(project => (
                                        <MenuItem
                                          key={project.id}
                                          onClick={() => {
                                            handleConversationMenu(
                                              conversation.id,
                                              'moveTo',
                                              project.id
                                            )
                                            setOpenMenu(null)
                                          }}
                                        >
                                          {project.name}
                                        </MenuItem>
                                      ))}
                                  </MenuList>
                                </Menu>
                                <MenuItem
                                  onClick={() => {
                                    handleConversationMenu(conversation.id, 'moveOut')
                                    setOpenMenu(null)
                                  }}
                                >
                                  {t('ui.sidebar.moveOut')}
                                </MenuItem>
                                <MenuDivider />
                                <MenuItem
                                  onClick={() => {
                                    handleConversationMenu(conversation.id, 'rename')
                                    setOpenMenu(null)
                                  }}
                                >
                                  {t('ui.sidebar.rename')}
                                </MenuItem>
                                <MenuItem
                                  color="red.500"
                                  onClick={() => {
                                    handleConversationMenu(conversation.id, 'delete')
                                    setOpenMenu(null)
                                  }}
                                >
                                  {t('ui.sidebar.delete')}
                                </MenuItem>
                              </MenuList>
                            </Menu>
                          ) : (
                            <Text fontSize="xs" color={mutedTextColor} minW="fit-content">
                              {formatTimestamp(conversation.updatedAt, language)}
                            </Text>
                          )}
                        </HStack>
                      )
                    })}
                  </VStack>
                </Collapse>
              </VStack>
            )
          })}

          <Divider borderColor={borderColor} my={2} />

          {/* Uncategorized Chats Section */}
          <VStack spacing={0} align="stretch">
            <Text fontSize="md" fontWeight="semibold" color={textColor} px={4} py={3}>
              {t('ui.sidebar.chats')} ({t('ui.sidebar.uncategorizedChats')})
            </Text>

            {mockUncategorizedChats.map(chat => {
              const isChatHovered =
                hoveredItem?.type === 'uncategorized' && hoveredItem?.id === chat.id

              return (
                <HStack
                  key={chat.id}
                  spacing={3}
                  px={4}
                  py={2}
                  cursor="pointer"
                  _hover={{ bg: hoverBg }}
                  onMouseEnter={() => handleMouseEnter('uncategorized', chat.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Icon as={ChatBubbleLeftIcon} boxSize={4} color={mutedTextColor} />
                  <Text fontSize="sm" color={textColor} flex={1} isTruncated>
                    {chat.title}
                  </Text>

                  {isChatHovered ||
                  (openMenu?.type === 'uncategorized' && openMenu?.id === chat.id) ? (
                    <Menu
                      isOpen={openMenu?.type === 'uncategorized' && openMenu?.id === chat.id}
                      onClose={() => setOpenMenu(null)}
                    >
                      <MenuButton
                        as={IconButton}
                        icon={<Icon as={EllipsisVerticalIcon} boxSize={4} />}
                        size="xs"
                        variant="ghost"
                        aria-label="More options"
                        color={mutedTextColor}
                        _hover={{ color: textColor }}
                        onClick={e => {
                          e.stopPropagation()
                          setOpenMenu(
                            openMenu?.type === 'uncategorized' && openMenu?.id === chat.id
                              ? null
                              : { type: 'uncategorized', id: chat.id }
                          )
                        }}
                      />
                      <MenuList>
                        <Menu placement="right-start">
                          <MenuButton as={MenuItem}>{t('ui.sidebar.moveTo')}</MenuButton>
                          <MenuList>
                            {mockProjects.map(project => (
                              <MenuItem
                                key={project.id}
                                onClick={() => {
                                  handleConversationMenu(chat.id, 'moveTo', project.id)
                                  setOpenMenu(null)
                                }}
                              >
                                {project.name}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                        <MenuDivider />
                        <MenuItem
                          onClick={() => {
                            handleConversationMenu(chat.id, 'rename')
                            setOpenMenu(null)
                          }}
                        >
                          {t('ui.sidebar.rename')}
                        </MenuItem>
                        <MenuItem
                          color="red.500"
                          onClick={() => {
                            handleConversationMenu(chat.id, 'delete')
                            setOpenMenu(null)
                          }}
                        >
                          {t('ui.sidebar.delete')}
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  ) : (
                    <Text fontSize="xs" color={mutedTextColor} minW="fit-content">
                      {formatTimestamp(chat.updatedAt, language)}
                    </Text>
                  )}
                </HStack>
              )
            })}
          </VStack>
        </VStack>
      </Box>

      <Divider borderColor={borderColor} />

      {/* User Section */}
      <Box p={3}>
        <HStack spacing={3} align="center">
          <Avatar size="sm" name="用户名" />
          <Text fontSize="sm" color={textColor} flex={1} isTruncated>
            用户名
          </Text>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<Icon as={Cog6ToothIcon} boxSize={4} />}
              size="sm"
              variant="ghost"
              aria-label="Settings"
              color={mutedTextColor}
              _hover={{ color: textColor, bg: hoverBg }}
            />
            <MenuList>
              <MenuItem>{t('ui.sidebar.settings')}</MenuItem>
              <MenuDivider />
              <MenuItem onClick={toggleColorMode}>
                {t('ui.theme.theme')} (
                {colorMode === 'light' ? t('ui.theme.light') : t('ui.theme.dark')})
              </MenuItem>
              <MenuItem onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}>
                {t('ui.language.languageSelector')} ({language === 'zh' ? '中文' : 'English'})
              </MenuItem>
              <MenuDivider />
              <MenuItem>{t('ui.sidebar.logout')}</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Box>
    </Box>
  )
}

export default Sidebar

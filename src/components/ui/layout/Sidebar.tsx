/**
 * Sidebar Component for Knowlex Desktop Application
 *
 * This component renders the main sidebar with navigation items,
 * project list, conversation list, and user settings.
 */

import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Collapse,
  Divider,
  Avatar,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  UserIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/providers'
import type { SidebarProps } from '../types'

// Mock data for demonstration
const mockProjects = [
  {
    _id: '1',
    name: 'Research Project',
    conversationCount: 5,
    isExpanded: true,
    conversations: [
      {
        _id: '1',
        title: 'Literature Review',
        preview: 'Discussing recent papers...',
        updatedAt: new Date(),
      },
      {
        _id: '2',
        title: 'Data Analysis',
        preview: 'Working on statistical analysis...',
        updatedAt: new Date(),
      },
    ],
  },
  {
    _id: '2',
    name: 'Web Development',
    conversationCount: 3,
    isExpanded: false,
    conversations: [
      {
        _id: '3',
        title: 'React Components',
        preview: 'Building reusable components...',
        updatedAt: new Date(),
      },
    ],
  },
]

const Sidebar: React.FC<SidebarProps> = ({
  _isOpen = true,
  isCollapsed = false,
  _onToggle,
  width = '260px',
  collapsedWidth = '60px',
  className,
  'data-testid': testId,
  ...props
}) => {
  const { t } = useTranslations()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(['1']))

  // Theme-aware _colors
  const bgColor = useColorModeValue('gray.50', 'dark.100')
  const borderColor = useColorModeValue('gray.200', 'dark.300')
  const hoverBg = useColorModeValue('gray.100', 'dark.200')
  const activeBg = useColorModeValue('primary.50', 'primary.900')
  const textColor = useColorModeValue('gray.700', 'dark.600')
  const mutedTextColor = useColorModeValue('gray.500', 'dark.500')

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const currentWidth = isCollapsed ? collapsedWidth : width

  return (
    <Box
      width={currentWidth}
      height="100%"
      bg={bgColor}
      borderRight="1px solid"
      borderColor={borderColor}
      display="flex"
      flexDirection="column"
      transition="width 0.2s ease"
      className={className}
      data-testid={testId}
      {...props}
    >
      {/* Header Section */}
      <VStack spacing={3} p={4} align="stretch">
        {/* New Chat Button */}
        <Menu>
          <MenuButton
            as={Button}
            leftIcon={<PlusIcon className="w-4 h-4" />}
            colorScheme="primary"
            size="sm"
            width="100%"
            justifyContent={isCollapsed ? 'center' : 'flex-start'}
          >
            {!isCollapsed && t('ui.sidebar.newChat')}
          </MenuButton>
          <MenuList>
            <MenuItem icon={<PlusIcon className="w-4 h-4" />}>{t('ui.sidebar.newChat')}</MenuItem>
            <MenuItem icon={<ChatBubbleLeftIcon className="w-4 h-4" />}>
              Continue from template
            </MenuItem>
            <MenuItem icon={<MagnifyingGlassIcon className="w-4 h-4" />}>Browse templates</MenuItem>
          </MenuList>
        </Menu>

        {/* Search */}
        {!isCollapsed && (
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <MagnifyingGlassIcon className="w-4 h-4" color={mutedTextColor} />
            </InputLeftElement>
            <Input
              placeholder={t('ui.sidebar.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              bg={useColorModeValue('white', 'dark.200')}
              border="1px solid"
              borderColor={useColorModeValue('gray.300', 'dark.400')}
              _focus={{
                borderColor: 'primary.500',
                boxShadow: '0 0 0 1px var(--chakra-_colors-primary-500)',
              }}
            />
          </InputGroup>
        )}
      </VStack>

      <Divider />

      {/* Projects and Conversations */}
      <Box flex={1} overflow="auto" className="scrollbar-thin">
        <VStack spacing={0} align="stretch">
          <Menu>
            <MenuList bg={bgColor} border="none" boxShadow="none" p={0} minW="100%" maxW="100%">
              {mockProjects.map(project => (
                <MenuGroup key={project._id} title={isCollapsed ? '' : project.name}>
                  {/* Project Header */}
                  <MenuItem
                    icon={
                      <IconButton
                        icon={
                          expandedProjects.has(project._id) ? (
                            <ChevronDownIcon className="w-3 h-3" />
                          ) : (
                            <ChevronRightIcon className="w-3 h-3" />
                          )
                        }
                        size="xs"
                        variant="ghost"
                        aria-label="Toggle project"
                        minW="auto"
                        h="auto"
                      />
                    }
                    command={isCollapsed ? undefined : project.conversationCount.toString()}
                    onClick={() => toggleProject(project._id)}
                    closeOnSelect={false}
                    bg="transparent"
                    _hover={{ bg: hoverBg }}
                    _focus={{ bg: activeBg }}
                  >
                    {!isCollapsed && project.name}
                  </MenuItem>

                  {/* Conversations */}
                  {!isCollapsed && (
                    <Collapse in={expandedProjects.has(project._id)}>
                      <MenuList
                        bg={bgColor}
                        border="none"
                        boxShadow="none"
                        p={0}
                        ml={6}
                        minW="calc(100% - 24px)"
                      >
                        {project.conversations.map(conversation => (
                          <MenuItem
                            key={conversation._id}
                            icon={<ChatBubbleLeftIcon className="w-4 h-4" />}
                            closeOnSelect={false}
                            bg="transparent"
                            _hover={{ bg: hoverBg }}
                            _focus={{ bg: activeBg }}
                          >
                            <VStack align="start" spacing={0} flex={1}>
                              <Text fontSize="sm" color={textColor} fontWeight="medium" isTruncated>
                                {conversation.title}
                              </Text>
                              <Text fontSize="xs" color={mutedTextColor} isTruncated>
                                {conversation.preview}
                              </Text>
                            </VStack>
                          </MenuItem>
                        ))}
                      </MenuList>
                    </Collapse>
                  )}
                  <MenuDivider />
                </MenuGroup>
              ))}

              {/* Uncategorized Conversations */}
              {!isCollapsed && (
                <>
                  <MenuGroup title={t('ui.sidebar.conversations')}>
                    <MenuItem
                      icon={<ChatBubbleLeftIcon className="w-4 h-4" />}
                      closeOnSelect={false}
                      bg="transparent"
                      _hover={{ bg: hoverBg }}
                      _focus={{ bg: activeBg }}
                    >
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" color={textColor} fontWeight="medium" isTruncated>
                          Sample Conversation
                        </Text>
                        <Text fontSize="xs" color={mutedTextColor} isTruncated>
                          This is a sample uncategorized conversation
                        </Text>
                      </VStack>
                    </MenuItem>
                  </MenuGroup>
                  <MenuDivider />
                </>
              )}
            </MenuList>
          </Menu>
        </VStack>
      </Box>

      <Divider />

      {/* User Section */}
      <Box p={3}>
        <Menu>
          <MenuButton
            as={HStack}
            spacing={3}
            p={2}
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: hoverBg }}
            width="100%"
          >
            <Avatar size="sm" name="User" />
            {!isCollapsed && (
              <>
                <VStack spacing={0} align="start" flex={1}>
                  <Text fontSize="sm" fontWeight="medium" color={textColor}>
                    User Name
                  </Text>
                  <Text fontSize="xs" color={mutedTextColor}>
                    user@example.com
                  </Text>
                </VStack>
                <Cog6ToothIcon className="w-4 h-4" color={mutedTextColor} />
              </>
            )}
          </MenuButton>
          <MenuList>
            <MenuItem icon={<UserIcon className="w-4 h-4" />}>{t('ui.sidebar.profile')}</MenuItem>
            <MenuItem icon={<Cog6ToothIcon className="w-4 h-4" />}>
              {t('ui.sidebar.settings')}
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </Box>
  )
}

export default Sidebar

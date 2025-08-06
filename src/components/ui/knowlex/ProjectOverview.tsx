/**
 * Project Overview Component for Knowlex Desktop Application
 *
 * This component displays project information, statistics, and quick actions
 * including conversations, files, memories, and knowledge management.
 */

import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Card,
  CardBody,
  CardHeader,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Avatar,
  AvatarGroup,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import {
  PlusIcon,
  ChatBubbleLeftIcon,
  DocumentIcon,
  LightBulbIcon,
  BookOpenIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/providers'

// Mock project data
const mockProject = {
  _id: '1',
  name: 'Research Project',
  description:
    'A comprehensive research project on artificial intelligence and machine learning applications in healthcare.',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
  stats: {
    conversations: 12,
    files: 8,
    memories: 5,
    knowledge: 15,
  },
  recentActivity: [
    {
      _id: '1',
      type: 'conversation',
      title: 'AI Ethics Discussion',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      _id: '2',
      type: 'file',
      title: 'research-paper.pdf',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      _id: '3',
      type: 'knowledge',
      title: 'Neural Network Architectures',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    },
  ],
  tags: ['AI', 'Healthcare', 'Research', 'ML'],
}

// Quick action card component
const QuickActionCard: React.FC<{
  title: string
  description: string
  icon: React.ReactNode
  count: number
  color: string
  onClick: () => void
}> = ({ title, description, icon, count, color, onClick }) => {
  const cardBg = useColorModeValue('white', 'dark.100')
  const borderColor = useColorModeValue('gray.200', 'dark.300')
  const hoverBg = useColorModeValue('gray.50', 'dark.200')

  return (
    <Card
      cursor="pointer"
      onClick={onClick}
      bg={cardBg}
      border="1px solid"
      borderColor={borderColor}
      _hover={{
        bg: hoverBg,
        transform: 'translateY(-2px)',
        boxShadow: useColorModeValue('md', 'dark.md'),
      }}
      transition="all 0.2s"
    >
      <CardBody p={4}>
        <VStack spacing={3} align="start">
          <HStack spacing={3} w="100%">
            <Box p={2} borderRadius="md" bg={`${color}.100`} color={`${color}.600`}>
              {icon}
            </Box>
            <VStack align="start" spacing={0} flex={1}>
              <Text fontWeight="semibold" fontSize="sm">
                {title}
              </Text>
              <Text fontSize="xs" color={useColorModeValue('gray.500', 'dark.500')}>
                {description}
              </Text>
            </VStack>
            <Badge colorScheme={color} variant="subtle">
              {count}
            </Badge>
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  )
}

// Recent activity item component
const ActivityItem: React.FC<{
  type: string
  title: string
  timestamp: Date
  onClick: () => void
}> = ({ type, title, timestamp, onClick }) => {
  const { formatRelativeTime } = useTranslations()
  const hoverBg = useColorModeValue('gray.50', 'dark.200')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return <ChatBubbleLeftIcon className="w-4 h-4" />
      case 'file':
        return <DocumentIcon className="w-4 h-4" />
      case 'knowledge':
        return <BookOpenIcon className="w-4 h-4" />
      case 'memory':
        return <LightBulbIcon className="w-4 h-4" />
      default:
        return <DocumentIcon className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conversation':
        return 'blue'
      case 'file':
        return 'green'
      case 'knowledge':
        return 'purple'
      case 'memory':
        return 'orange'
      default:
        return 'gray'
    }
  }

  return (
    <HStack
      spacing={3}
      p={2}
      borderRadius="md"
      cursor="pointer"
      onClick={onClick}
      _hover={{ bg: hoverBg }}
    >
      <Box
        p={1}
        borderRadius="sm"
        bg={`${getTypeColor(type)}.100`}
        color={`${getTypeColor(type)}.600`}
      >
        {getTypeIcon(type)}
      </Box>
      <VStack align="start" spacing={0} flex={1}>
        <Text fontSize="sm" fontWeight="medium">
          {title}
        </Text>
        <Text fontSize="xs" color={useColorModeValue('gray.500', 'dark.500')}>
          {formatRelativeTime(timestamp)}
        </Text>
      </VStack>
      <ArrowRightIcon className="w-3 h-3" color={useColorModeValue('gray.400', 'dark.400')} />
    </HStack>
  )
}

const ProjectOverview: React.FC = () => {
  const { t, formatDate } = useTranslations()
  const [selectedProject] = useState(mockProject)

  // Theme-aware _colors
  const bgColor = useColorModeValue('gray.50', 'dark.50')
  const cardBg = useColorModeValue('white', 'dark.100')
  const borderColor = useColorModeValue('gray.200', 'dark.300')
  const textColor = useColorModeValue('gray.800', 'dark.700')
  const mutedTextColor = useColorModeValue('gray.500', 'dark.500')

  // Action handlers
  const handleNewConversation = () => {
    // console.log('New conversation')
  }

  const handleViewConversations = () => {
    // console.log('View conversations')
  }

  const handleViewFiles = () => {
    // console.log('View files')
  }

  const handleViewMemories = () => {
    // console.log('View memories')
  }

  const handleViewKnowledge = () => {
    // console.log('View knowledge')
  }

  const handleEditProject = () => {
    // console.log('Edit project')
  }

  const handleDeleteProject = () => {
    // console.log('Delete project')
  }

  const handleActivityClick = (item: unknown) => {
    // console.log('Activity clicked:', item)
  }

  if (!selectedProject) {
    return (
      <Box height="100%" display="flex" alignItems="center" justifyContent="center" bg={bgColor}>
        <VStack spacing={4} textAlign="center">
          <Text fontSize="lg" color={mutedTextColor}>
            {t('ui.project.noProjectSelected')}
          </Text>
          <Text fontSize="sm" color={mutedTextColor}>
            {t('ui.project.selectProject')}
          </Text>
        </VStack>
      </Box>
    )
  }

  return (
    <Box height="100%" overflow="auto" bg={bgColor} className="scrollbar-thin">
      <VStack spacing={6} align="stretch" p={6} maxW="1200px" mx="auto">
        {/* Project Header */}
        <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <HStack justify="space-between" mb={4}>
              <VStack align="start" spacing={1} flex={1}>
                <HStack spacing={3}>
                  <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                    {selectedProject.name}
                  </Text>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<EllipsisHorizontalIcon className="w-4 h-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Project actions"
                    />
                    <MenuList>
                      <MenuItem
                        icon={<PencilIcon className="w-4 h-4" />}
                        onClick={handleEditProject}
                      >
                        {t('ui.project.editProject')}
                      </MenuItem>
                      <MenuItem
                        icon={<TrashIcon className="w-4 h-4" />}
                        onClick={handleDeleteProject}
                        color="red.500"
                      >
                        {t('ui.project.deleteProject')}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
                <Text color={mutedTextColor} mb={3}>
                  {selectedProject.description}
                </Text>
                <HStack spacing={2} flexWrap="wrap">
                  {selectedProject.tags.map(tag => (
                    <Badge key={tag} colorScheme="primary" variant="subtle">
                      {tag}
                    </Badge>
                  ))}
                </HStack>
              </VStack>
            </HStack>

            <HStack spacing={6} color={mutedTextColor} fontSize="sm">
              <Text>
                {t('ui.project.created')}: {formatDate(selectedProject.createdAt)}
              </Text>
              <Text>
                {t('ui.project.modified')}: {formatDate(selectedProject.updatedAt)}
              </Text>
            </HStack>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="center">
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>
              Quick Actions
            </Text>
            <Button
              leftIcon={<PlusIcon className="w-4 h-4" />}
              colorScheme="primary"
              size="sm"
              onClick={handleNewConversation}
            >
              {t('ui.sidebar.newChat')}
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            <QuickActionCard
              title={t('ui.project.conversations')}
              description="Chat with AI"
              icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
              count={selectedProject.stats.conversations}
              color="blue"
              onClick={handleViewConversations}
            />
            <QuickActionCard
              title={t('ui.project.files')}
              description="Documents & data"
              icon={<DocumentIcon className="w-5 h-5" />}
              count={selectedProject.stats.files}
              color="green"
              onClick={handleViewFiles}
            />
            <QuickActionCard
              title={t('ui.project.memories')}
              description="Project context"
              icon={<LightBulbIcon className="w-5 h-5" />}
              count={selectedProject.stats.memories}
              color="orange"
              onClick={handleViewMemories}
            />
            <QuickActionCard
              title={t('ui.project.knowledge')}
              description="Saved insights"
              icon={<BookOpenIcon className="w-5 h-5" />}
              count={selectedProject.stats.knowledge}
              color="purple"
              onClick={handleViewKnowledge}
            />
          </SimpleGrid>
        </VStack>

        {/* Statistics Overview */}
        <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>
              Project Statistics
            </Text>
          </CardHeader>
          <CardBody pt={0}>
            <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
              <Stat>
                <StatLabel>{t('ui.project.conversations')}</StatLabel>
                <StatNumber color="blue.500">{selectedProject.stats.conversations}</StatNumber>
                <StatHelpText>Total discussions</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>{t('ui.project.files')}</StatLabel>
                <StatNumber color="green.500">{selectedProject.stats.files}</StatNumber>
                <StatHelpText>Documents uploaded</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>{t('ui.project.memories')}</StatLabel>
                <StatNumber color="orange.500">{selectedProject.stats.memories}</StatNumber>
                <StatHelpText>Context items</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>{t('ui.project.knowledge')}</StatLabel>
                <StatNumber color="purple.500">{selectedProject.stats.knowledge}</StatNumber>
                <StatHelpText>Knowledge cards</StatHelpText>
              </Stat>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card bg={cardBg} border="1px solid" borderColor={borderColor}>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>
              Recent Activity
            </Text>
          </CardHeader>
          <CardBody pt={0}>
            <VStack spacing={1} align="stretch">
              {selectedProject.recentActivity.map((item, _index) => (
                <React.Fragment key={item._id}>
                  <ActivityItem
                    type={item.type}
                    title={item.title}
                    timestamp={item.timestamp}
                    onClick={() => handleActivityClick(item)}
                  />
                  {_index < selectedProject.recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
}

export default ProjectOverview

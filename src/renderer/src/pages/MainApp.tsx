import React from 'react'
import { Box, Text, VStack, HStack, Icon } from '@chakra-ui/react'
import { ChatIcon, SettingsIcon, SearchIcon, AddIcon } from '@chakra-ui/icons'
import { MainLayout } from '../components/layout'
import { Button } from '../components/ui/Button'

/**
 * Main application interface - the primary user workspace
 *
 * Features:
 * - Uses MainLayout with integrated Sidebar
 * - Welcome screen for first-time users
 * - Quick action buttons for getting started
 * - Responsive design for different screen sizes
 */
function MainApp(): JSX.Element {
  return (
    <MainLayout>
      {/* Main Content Area */}
      <Box display="flex" flexDirection="column" h="100vh">
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor="border.primary" bg="surface.secondary">
          <HStack justify="space-between">
            <Text fontSize="xl" fontWeight="semibold" color="text.primary">
              Welcome to Knowlex
            </Text>
            <HStack spacing={2}>
              <Button leftIcon={<SearchIcon />} variant="ghost" size="sm">
                Search
              </Button>
              <Button leftIcon={<SettingsIcon />} variant="ghost" size="sm">
                Settings
              </Button>
            </HStack>
          </HStack>
        </Box>

        {/* Welcome Content */}
        <Box
          flex={1}
          p={8}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="background.primary"
        >
          <VStack spacing={6} textAlign="center" maxW="md">
            <Icon as={ChatIcon} boxSize={12} color="primary.500" />
            <Text fontSize="2xl" fontWeight="bold" color="text.primary">
              Ready to start your intelligent workspace
            </Text>
            <Text color="text.secondary" lineHeight="1.6">
              Create a new chat conversation or start a project to begin organizing your research,
              notes, and AI-powered discussions in one unified workspace.
            </Text>
            <HStack spacing={4}>
              <Button colorScheme="blue" leftIcon={<ChatIcon />}>
                Start New Chat
              </Button>
              <Button variant="outline" leftIcon={<AddIcon />}>
                Create Project
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </MainLayout>
  )
}

export default MainApp

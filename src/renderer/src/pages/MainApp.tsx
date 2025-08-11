import React from 'react'
import { Box, Text, VStack, HStack, Button, Icon } from '@chakra-ui/react'
import { ChatIcon, SettingsIcon, SearchIcon, AddIcon } from '@chakra-ui/icons'

/**
 * Main application interface - the primary user workspace
 */
function MainApp(): JSX.Element {
  return (
    <HStack h="100vh" spacing={0}>
      {/* Sidebar */}
      <Box w="250px" bg="gray.100" borderRight="1px solid" borderColor="gray.200" p={4}>
        <VStack spacing={4} align="stretch">
          <Text fontSize="lg" fontWeight="bold" mb={2}>
            Knowlex
          </Text>

          <Button leftIcon={<AddIcon />} variant="outline" size="sm">
            New Chat
          </Button>

          <Button leftIcon={<AddIcon />} variant="outline" size="sm">
            New Project
          </Button>

          <Box mt={6}>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Recent Conversations
            </Text>
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                No conversations yet
              </Text>
            </VStack>
          </Box>

          <Box mt={6}>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Projects
            </Text>
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                No projects yet
              </Text>
            </VStack>
          </Box>
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex={1} bg="white" display="flex" flexDirection="column">
        {/* Header */}
        <Box p={4} borderBottom="1px solid" borderColor="gray.200">
          <HStack justify="space-between">
            <Text fontSize="xl" fontWeight="semibold">
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

        {/* Main Content Area */}
        <Box flex={1} p={8} display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={6} textAlign="center" maxW="md">
            <Icon as={ChatIcon} boxSize={12} color="blue.500" />
            <Text fontSize="2xl" fontWeight="bold">
              Ready to start your intelligent workspace
            </Text>
            <Text color="gray.600" lineHeight="1.6">
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
    </HStack>
  )
}

export default MainApp

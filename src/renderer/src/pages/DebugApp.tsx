import React from 'react'
import { Box, Text, VStack, Badge } from '@chakra-ui/react'

/**
 * Debug application interface - minimal development window
 *
 * This is intentionally minimal to avoid conflicts with the main app
 */
function DebugApp(): JSX.Element {
  return (
    <Box h="100vh" bg="gray.900" color="white" p={8}>
      <VStack spacing={6} align="center" justify="center" h="full">
        <Badge colorScheme="green" fontSize="lg" p={3} borderRadius="md">
          Debug Window
        </Badge>

        <Text fontSize="2xl" fontWeight="bold" color="green.400" textAlign="center">
          Knowlex Debug Console
        </Text>

        <Text fontSize="md" color="gray.400" textAlign="center" maxW="md">
          This debug window is running separately from the main application. Use the main window to
          test the chat interface and core functionality.
        </Text>

        <VStack spacing={2} color="gray.500" fontSize="sm">
          <Text>• Main Window: Chat interface and application features</Text>
          <Text>• Debug Window: Development tools and monitoring</Text>
          <Text>• Both windows run independently</Text>
        </VStack>

        <Badge colorScheme="blue" fontSize="sm">
          Environment: Development
        </Badge>
      </VStack>
    </Box>
  )
}

export default DebugApp

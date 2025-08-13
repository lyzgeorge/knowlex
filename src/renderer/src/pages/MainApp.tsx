import React from 'react'
import { Box } from '@chakra-ui/react'
import { MainLayout } from '../components/layout'
import { ChatInterface } from '../components/features/chat'

/**
 * Main application interface - the primary user workspace
 *
 * Features:
 * - Uses MainLayout with integrated Sidebar
 * - Shows ChatInterface for selected conversations
 * - Responsive design for different screen sizes
 */
function MainApp(): JSX.Element {
  return (
    <MainLayout>
      {/* Main Content Area */}
      <Box display="flex" flexDirection="column" h="100%">
        {/* Chat Interface */}
        <Box flex={1} bg="background.primary" minH={0}>
          <ChatInterface />
        </Box>
      </Box>
    </MainLayout>
  )
}

export default MainApp

import { Box } from '@chakra-ui/react'
import { MainLayout } from '../components/layout/MainLayout'
import ChatInterface from '../components/features/chat/ChatInterface'
import { NotificationProvider } from '../components/ui'

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
    <NotificationProvider>
      <MainLayout>
        {/* Main Content Area */}
        <Box display="flex" flexDirection="column" h="100%">
          {/* Chat Interface */}
          <Box flex={1} bg="background.primary" minH={0}>
            <ChatInterface />
          </Box>
        </Box>
      </MainLayout>
    </NotificationProvider>
  )
}

export default MainApp

import { Box } from '@chakra-ui/react'
import { MainLayout } from '../components/layout/MainLayout'
import MainPage from '../components/features/chat/MainPage'
import ConversationPage from '../components/features/chat/ConversationPage'
import { useCurrentConversation } from '../stores/conversation'
import { NotificationProvider } from '../components/ui'

/**
 * Main application interface - the primary user workspace
 *
 * Features:
 * - Uses MainLayout with integrated Sidebar
 * - Routes between MainPage (no conversation) and ConversationPage (active conversation)
 * - Responsive design for different screen sizes
 */
function MainApp(): JSX.Element {
  const { currentConversation, currentMessages } = useCurrentConversation()

  return (
    <NotificationProvider>
      <MainLayout>
        {/* Main Content Area */}
        <Box display="flex" flexDirection="column" h="100%">
          {/* Page Content - Direct routing without intermediate component */}
          <Box flex={1} bg="background.primary" minH={0}>
            {!currentConversation || currentMessages.length === 0 ? (
              <MainPage />
            ) : (
              <ConversationPage />
            )}
          </Box>
        </Box>
      </MainLayout>
    </NotificationProvider>
  )
}

export default MainApp

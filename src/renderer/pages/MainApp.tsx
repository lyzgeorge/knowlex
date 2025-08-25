import { Box } from '@chakra-ui/react'
import { MainLayout } from '@renderer/components/layout/MainLayout'
import MainPage from '@renderer/components/features/chat/MainPage'
import ConversationPage from '@renderer/components/features/chat/ConversationPage'
import { useCurrentConversation } from '@renderer/stores/conversation'
import { useCurrentView } from '@renderer/stores/navigation'
import ProjectPage from '@renderer/components/features/projects/ProjectPage'
import { NotificationProvider } from '@renderer/components/ui'

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
  const { currentView, selectedProjectId } = useCurrentView()

  return (
    <NotificationProvider>
      <MainLayout>
        {/* Main Content Area */}
        <Box display="flex" flexDirection="column" h="100%">
          {/* Page Content - Direct routing without intermediate component */}
          <Box flex={1} bg="background.primary" minH={0}>
            {currentView === 'project-detail' && selectedProjectId ? (
              <ProjectPage projectId={selectedProjectId} />
            ) : !currentConversation || currentMessages.length === 0 ? (
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

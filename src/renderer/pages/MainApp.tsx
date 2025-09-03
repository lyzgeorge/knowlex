import { Box } from '@chakra-ui/react'
import { MainLayout } from '@renderer/components/layout/MainLayout'
import MainPage from '@renderer/components/features/chat/MainPage'
import ConversationPage from '@renderer/components/features/chat/ConversationPage'
import { useCurrentView, useSettingsModal, useNavigationActions } from '@renderer/stores/navigation'
import ProjectPage from '@renderer/components/features/projects/ProjectPage'
import { SettingsModal } from '@renderer/components/features/settings'
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
  const { currentView, selectedProjectId } = useCurrentView()
  const { isSettingsOpen, settingsDefaultTab } = useSettingsModal()
  const { closeSettings } = useNavigationActions()

  return (
    <NotificationProvider>
      <MainLayout>
        {/* Main Content Area */}
        <Box display="flex" flexDirection="column" h="100%">
          {/* Page Content - Direct view-based routing */}
          <Box flex={1} bg="background.primary" minH={0}>
            {(() => {
              switch (currentView) {
                case 'home':
                  return <MainPage />
                case 'project':
                  return selectedProjectId ? (
                    <ProjectPage projectId={selectedProjectId} />
                  ) : (
                    <MainPage />
                  )
                case 'conversation':
                  return <ConversationPage />
                default:
                  return <MainPage />
              }
            })()}
          </Box>
        </Box>

        {/* Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={closeSettings}
          defaultTab={settingsDefaultTab}
        />
      </MainLayout>
    </NotificationProvider>
  )
}

export default MainApp

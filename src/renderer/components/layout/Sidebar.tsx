import React, { useState, useCallback } from 'react'
import {
  Box,
  VStack,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react'
import { HiChevronLeft, HiChevronRight, HiPlus } from 'react-icons/hi2'
import { Button } from '@renderer/components/ui/Button'
import { SidebarHeader } from './SidebarHeader'
import { ProjectsSection } from './ProjectsSection'
import { ConversationsSection } from './ConversationsSection'
import { SidebarFooter } from './SidebarFooter'
import { useConversationManagement } from '@renderer/hooks/useConversationManagement'
import { useNavigationActions } from '@renderer/stores/navigation'
import { useSidebarCollapsed, useToggleSidebarCollapse } from '@renderer/stores/app'
import { useI18n } from '@renderer/hooks/useI18n'

export interface SidebarProps {
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')
  const sidebarCollapsed = useSidebarCollapsed()
  const toggleSidebarCollapse = useToggleSidebarCollapse()

  const {
    conversations,
    uncategorizedConversations,
    currentConversationId,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    confirmDelete,
    isDeleteOpen,
    onDeleteClose,
    cancelRef,
    isDeleting,
    sentinelRef,
    hasMoreConversations,
    isLoadingMore
  } = useConversationManagement()

  const { openProject } = useNavigationActions()

  const handleProjectSelect = useCallback(
    (projectId: string) => {
      console.debug('[Sidebar] project selected:', projectId)
      openProject(projectId)
    },
    [openProject]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    console.log('Searching for:', query)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'n':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleNewChat()
          }
          break
        case 'k':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            const searchInput = document.querySelector(
              `[placeholder="${t('sidebar.globalSearch')}"]`
            ) as HTMLInputElement
            if (searchInput) {
              searchInput.focus()
            }
          }
          break
        case 'Escape':
          if (
            e.target instanceof HTMLInputElement &&
            e.target.placeholder === t('sidebar.globalSearch')
          ) {
            setSearchQuery('')
            e.target.blur()
          }
          break
      }
    },
    [handleNewChat, t]
  )

  return (
    <Box
      w={sidebarCollapsed ? '60px' : '280px'}
      h="100vh"
      bg="background.tertiary"
      display="flex"
      flexDirection="column"
      className={className}
      position="relative"
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Main navigation sidebar"
      tabIndex={-1}
      transition="width 0.2s ease-in-out"
    >
      {/* Collapse/Expand Toggle Button */}
      <Box position="absolute" right="-12px" top="16px" zIndex={1001} pt="2rem">
        <Tooltip
          label={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          placement="right"
        >
          <IconButton
            aria-label={sidebarCollapsed ? t('sidebar.expand') : t('sidebar.collapse')}
            icon={sidebarCollapsed ? <HiChevronRight /> : <HiChevronLeft />}
            onClick={toggleSidebarCollapse}
            size="sm"
            variant="solid"
            bg="surface.secondary"
            color="text.primary"
            _hover={{
              bg: 'surface.tertiary'
            }}
            borderRadius="full"
            boxShadow="md"
          />
        </Tooltip>
      </Box>

      {!sidebarCollapsed ? (
        <>
          <SidebarHeader
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            onNewChat={handleNewChat}
          />

          <Box flex={1} overflowY="auto" overflowX="hidden">
            <VStack spacing={0} align="stretch">
              <Box px={2}>
                {/* Pass the project select handler so it is used */}
                <ProjectsSection
                  filteredConversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={handleSelectConversation} // only for conversation rows
                  onDeleteConversation={handleDeleteConversation}
                  onSelectProject={handleProjectSelect} // NEW: implement inside ProjectsSection
                />
              </Box>

              <Box px={2}>
                <ConversationsSection
                  conversations={uncategorizedConversations}
                  currentConversationId={currentConversationId}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  isLoadingMore={isLoadingMore}
                  hasMoreConversations={hasMoreConversations}
                  sentinelRef={sentinelRef}
                />
              </Box>
            </VStack>
          </Box>

          <SidebarFooter />
        </>
      ) : (
        // Collapsed sidebar - show minimal UI
        <Box display="flex" flexDirection="column" alignItems="center" py={4} gap={3} pt="6rem">
          <Tooltip label={t('sidebar.newChat')} placement="right">
            <IconButton
              aria-label={t('sidebar.newChat')}
              icon={<HiPlus />}
              onClick={handleNewChat}
              size="sm"
              variant="solid"
              bg="primary.500"
              borderRadius="lg"
            />
          </Tooltip>
        </Box>
      )}

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} leastDestructiveRef={cancelRef} onClose={onDeleteClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('conversation.delete')}
            </AlertDialogHeader>

            <AlertDialogBody>{t('conversation.deleteConfirm')}</AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                {t('conversation.cancel')}
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={isDeleting}>
                {t('conversation.delete_action')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}

export default Sidebar

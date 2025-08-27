import React, { useState, useCallback } from 'react'
import {
  Box,
  VStack,
  Divider,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react'
import { Button } from '@renderer/components/ui/Button'
import { SidebarHeader } from './SidebarHeader'
import { ProjectsSection } from './ProjectsSection'
import { ConversationsSection } from './ConversationsSection'
import { SidebarFooter } from './SidebarFooter'
import { useConversationManagement } from '@renderer/hooks/useConversationManagement'
import { useNavigationActions } from '@renderer/stores/navigation'
import { useI18n } from '@renderer/hooks/useI18n'

export interface SidebarProps {
  className?: string
}

/**
 * 侧边栏导航组件 - Task 16
 *
 * 实现要求:
 * - 固定280px宽度，Logo显示，"+ New Chat"按钮
 * - 项目列表：可展开/折叠，文件夹图标，项目名称显示
 * - 会话列表：对话气泡图标，会话标题，时间戳显示
 * - 悬浮操作：项目操作图标（文件管理、复制、更多），会话操作菜单
 * - 虚拟滚动优化和键盘导航支持
 */
export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { t } = useI18n()
  const [searchQuery, setSearchQuery] = useState('')

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
    [handleNewChat]
  )

  return (
    <Box
      w="280px"
      h="100vh"
      bg="surface.primary"
      borderRight="1px solid"
      borderColor="border.primary"
      display="flex"
      flexDirection="column"
      className={className}
      position="relative"
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label="Main navigation sidebar"
      tabIndex={-1}
    >
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

      <Divider />

      <SidebarFooter />

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

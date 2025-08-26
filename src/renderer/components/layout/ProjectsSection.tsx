import React from 'react'
import {
  Box,
  HStack,
  VStack,
  Text,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react'
import { LiaPlusSolid, LiaCheckSolid, LiaTimesSolid, LiaBarsSolid } from 'react-icons/lia'
import { LiaFolderSolid, LiaFolderOpenSolid } from 'react-icons/lia'
import { useProjectManagement } from '@renderer/hooks/useProjectManagement'
import { ConversationItem } from '@renderer/components/ui/ConversationItem'
import DeleteProjectModal from '@renderer/components/ui/DeleteProjectModal'
import { useConversationStore } from '@renderer/stores/conversation'
import { useInlineEdit } from '@renderer/hooks/useInlineEdit'

interface ProjectsSectionProps {
  filteredConversations: Array<{
    id: string
    title: string
    projectId?: string | null
  }>
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  onSelectProject: (projectId: string) => void
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  filteredConversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onSelectProject
}) => {
  const projectManagement = useProjectManagement()
  const { messages, conversations } = useConversationStore()
  const inlineEdit = useInlineEdit()
  // Hover state no longer needed; ConversationMenu handles its own hover UI

  const {
    projects,
    expanded,
    toggleProject,
    isCreatingProject,
    newProjectName,
    setNewProjectName,
    handleCreateProject,
    handleStartCreateProject,
    handleCancelCreateProject,
    editingProjectId,
    editingProjectName,
    setEditingProjectName,
    handleStartEditProject,
    handleConfirmEditProject,
    handleCancelEditProject,
    projectPendingDeletion,
    isDeleteProjectOpen,
    handleDeleteProject,
    handleConfirmDeleteProject,
    handleCloseDeleteProject
  } = projectManagement

  return (
    <Box>
      {/* Header */}
      <HStack justify="space-between" px={2} py={2}>
        <Text fontSize="sm" fontWeight={'semibold'} color="text.secondary">
          Projects
        </Text>
        <IconButton
          aria-label="New project"
          icon={<LiaPlusSolid />}
          size="xs"
          variant="ghost"
          onClick={handleStartCreateProject}
        />
      </HStack>

      {/* Create Project Form */}
      {isCreatingProject && (
        <HStack px={2} mb={2}>
          <Input
            placeholder="Project name"
            size="sm"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && newProjectName.trim()) {
                await handleCreateProject()
              } else if (e.key === 'Escape') {
                handleCancelCreateProject()
              }
            }}
            autoFocus
          />
          <IconButton
            aria-label="Create project"
            icon={<LiaCheckSolid />}
            size="xs"
            variant="ghost"
            isDisabled={!newProjectName.trim()}
            onClick={handleCreateProject}
          />
          <IconButton
            aria-label="Cancel"
            icon={<LiaTimesSolid />}
            size="xs"
            variant="ghost"
            onClick={handleCancelCreateProject}
          />
        </HStack>
      )}

      {/* Projects List */}
      <VStack spacing={0} align="stretch" role="list" aria-label="Projects">
        {projects.map((p) => (
          <Box key={p.id}>
            {/* Project Item */}
            <HStack
              role="listitem"
              p={2}
              borderRadius="md"
              _hover={{ bg: 'surface.hover' }}
              justify="space-between"
              cursor="pointer"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelectProject(p.id)
              }}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <HStack spacing={2}>
                <IconButton
                  aria-label={expanded[p.id] ? 'Collapse project' : 'Expand project'}
                  icon={expanded[p.id] ? <LiaFolderOpenSolid /> : <LiaFolderSolid />}
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleProject(p.id)
                  }}
                />
                {editingProjectId === p.id ? (
                  <HStack flex={1} spacing={1}>
                    <Input
                      value={editingProjectName}
                      onChange={(e) => setEditingProjectName(e.target.value)}
                      fontSize="sm"
                      variant="unstyled"
                      size="sm"
                      h="24px"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && editingProjectName.trim()) {
                          await handleConfirmEditProject(p.id)
                        } else if (e.key === 'Escape') {
                          handleCancelEditProject()
                        }
                      }}
                      autoFocus
                    />
                    <IconButton
                      aria-label="Confirm rename"
                      icon={<LiaCheckSolid />}
                      size="xs"
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation()
                        await handleConfirmEditProject(p.id)
                      }}
                    />
                    <IconButton
                      aria-label="Cancel rename"
                      icon={<LiaTimesSolid />}
                      size="xs"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancelEditProject()
                      }}
                    />
                  </HStack>
                ) : (
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    noOfLines={1}
                    cursor="pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectProject(p.id)
                    }}
                  >
                    {p.name}
                  </Text>
                )}
              </HStack>

              {editingProjectId !== p.id && (
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Project options"
                    icon={<LiaBarsSolid />}
                    size="xs"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <MenuList>
                    <MenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEditProject(p.id, p.name)
                      }}
                    >
                      Rename
                    </MenuItem>
                    <MenuItem
                      color="red.500"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(p.id, p.name)
                      }}
                    >
                      Delete
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>

            {/* Project Conversations */}
            {expanded[p.id] && (
              <VStack align="stretch" ml={2} spacing={0}>
                {filteredConversations
                  .filter((c) => c.projectId === p.id)
                  .map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      currentConversationId={currentConversationId}
                      onSelectConversation={onSelectConversation}
                      onDeleteConversation={onDeleteConversation}
                      editingConversationId={inlineEdit.editingConversationId}
                      editingTitle={inlineEdit.editingTitle}
                      setEditingTitle={inlineEdit.setEditingTitle}
                      onStartEdit={inlineEdit.handleStartEdit}
                      onCancelEdit={inlineEdit.handleCancelEdit}
                      onConfirmEdit={inlineEdit.handleConfirmEdit}
                      onInputBlur={inlineEdit.handleInputBlur}
                      isNested={true}
                      currentProjectId={p.id}
                    />
                  ))}
              </VStack>
            )}
          </Box>
        ))}
      </VStack>

      {/* Delete Project Modal */}
      <DeleteProjectModal
        isOpen={isDeleteProjectOpen}
        onClose={handleCloseDeleteProject}
        projectName={projectPendingDeletion?.name || ''}
        conversationCount={
          projectPendingDeletion
            ? conversations.filter((c) => c.projectId === projectPendingDeletion.id).length
            : 0
        }
        messageCount={
          projectPendingDeletion
            ? conversations
                .filter((c) => c.projectId === projectPendingDeletion.id)
                .map((c) => (messages[c.id] || []).length)
                .reduce((a, b) => a + b, 0)
            : 0
        }
        onConfirm={handleConfirmDeleteProject}
      />
    </Box>
  )
}

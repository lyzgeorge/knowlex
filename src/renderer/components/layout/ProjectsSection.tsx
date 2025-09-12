import React, { useCallback } from 'react'
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
  MenuItem,
  Tooltip
} from '@chakra-ui/react'
import { useI18n } from '@renderer/hooks/useI18n'
import DeleteProjectModal from '@renderer/components/ui/DeleteProjectModal'
import { useConversationStore } from '@renderer/stores/conversation/store'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import InlineEdit from '@renderer/components/ui/InlineEdit'
import { isNonEmptyString } from '@renderer/utils/validation'
import { HiPlus, HiCheck, HiXMark, HiBars3, HiFolder, HiFolderOpen } from 'react-icons/hi2'
import useEditableTitle from '@renderer/hooks/useEditableTitle'
import { useProjectManagement } from '@renderer/hooks/useProjectManagement'

interface ProjectsSectionProps {
  filteredConversations: Array<{
    id: string
    title: string
    projectId?: string | null
    updatedAt?: string
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
  const { t } = useI18n()
  const projectManagement = useProjectManagement()
  const { messages, conversations } = useConversationStore()

  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle)
  const startEdit = useCallback(() => {
    // kept for compatibility with ConversationMenu callback
  }, [])

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
        <Text fontSize="sm" fontStyle="italic" color="text.secondary">
          {t('sidebar.projects')}
        </Text>
        <IconButton
          aria-label="New project"
          icon={<HiPlus />}
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
              if (e.key === 'Enter' && isNonEmptyString(newProjectName)) {
                await handleCreateProject()
              } else if (e.key === 'Escape') {
                handleCancelCreateProject()
              }
            }}
            autoFocus
          />
          <IconButton
            aria-label="Create project"
            icon={<HiCheck />}
            size="xs"
            variant="ghost"
            isDisabled={!isNonEmptyString(newProjectName)}
            onClick={handleCreateProject}
          />
          <IconButton
            aria-label="Cancel"
            icon={<HiXMark />}
            size="xs"
            variant="ghost"
            onClick={handleCancelCreateProject}
          />
        </HStack>
      )}

      {/* Projects List */}
      <VStack spacing={0} align="stretch" role="list" aria-label="Projects">
        {projects.map((p: any) => (
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
                  icon={expanded[p.id] ? <HiFolderOpen /> : <HiFolder />}
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleProject(p.id)
                  }}
                />
                <InlineEdit
                  value={p.name}
                  isEditing={editingProjectId === p.id}
                  onStartEdit={() => handleStartEditProject(p.id, p.name)}
                  onCancelEdit={handleCancelEditProject}
                  onConfirmEdit={async (newName) => {
                    // Update the project name state and call the confirm handler
                    setEditingProjectName(newName)
                    await handleConfirmEditProject(p.id)
                  }}
                  placeholder="Enter project name..."
                >
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
                </InlineEdit>
              </HStack>

              {editingProjectId !== p.id && (
                <Menu>
                  <MenuButton
                    as={IconButton}
                    aria-label="Project options"
                    icon={<HiBars3 />}
                    size="xs"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <MenuList minW="120px" maxW="300px">
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
                  .map((conversation) => {
                    const isCurrent = currentConversationId === conversation.id
                    return (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isCurrent={isCurrent}
                        onSelectConversation={onSelectConversation}
                        onDeleteConversation={onDeleteConversation}
                        updateConversationTitle={updateConversationTitle}
                        projectId={p.id}
                        startEditCallback={startEdit}
                      />
                    )
                  })}
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

export default ProjectsSection

// Small per-conversation item to keep hook usage rules safe
const ConversationItem: React.FC<{
  conversation: any
  isCurrent: boolean
  onSelectConversation: (id: string) => void
  onDeleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => Promise<void>
  projectId: string
  startEditCallback: (id: string, title: string) => void
}> = ({
  conversation,
  isCurrent,
  onSelectConversation,
  onDeleteConversation,
  updateConversationTitle,
  projectId
}) => {
  const { editing, value, setValue, onStart, onCancel, onConfirm } = useEditableTitle(
    conversation.id,
    conversation.title,
    updateConversationTitle
  )

  return (
    <HStack
      key={conversation.id}
      role="listitem"
      p={2}
      pl={2}
      borderRadius="md"
      cursor="pointer"
      bg={isCurrent ? 'primary.100' : 'transparent'}
      borderLeft={isCurrent ? '3px solid' : 'none'}
      borderColor="primary.500"
      transition="all 0.2s"
      _hover={{ bg: isCurrent ? 'primary.50' : 'surface.hover' }}
      onClick={() => onSelectConversation(conversation.id)}
      justify="space-between"
      align="center"
    >
      {editing ? (
        <HStack flex={1} spacing={1}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            fontSize="sm"
            fontWeight="medium"
            variant="unstyled"
            size="sm"
            h="24px"
            lineHeight="24px"
            px={0}
            py={0}
            bg="transparent"
            _focus={{ boxShadow: 'none', bg: 'transparent' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void onConfirm()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                onCancel()
              }
            }}
            autoFocus
          />
        </HStack>
      ) : (
        <Tooltip
          label={conversation.title}
          placement="right"
          hasArrow
          openDelay={600}
          closeDelay={200}
          bg="surface.primary"
          color="text.primary"
          borderRadius="md"
          shadow="dropdown"
          fontSize="sm"
          fontWeight="medium"
          px={3}
          py={2}
          maxW="280px"
          textAlign="left"
          whiteSpace="normal"
        >
          <Text fontSize="sm" noOfLines={1} flex={1} py={0.5} minW={0}>
            {conversation.title}
          </Text>
        </Tooltip>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center">
        {editing ? (
          <HStack spacing={1}>
            <IconButton
              aria-label="Confirm rename"
              icon={<HiCheck />}
              size="xs"
              variant="ghost"
              color="green.500"
              _hover={{ bg: 'green.50', color: 'green.600' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                void onConfirm()
              }}
            />
            <IconButton
              aria-label="Cancel rename"
              icon={<HiXMark />}
              size="xs"
              variant="ghost"
              color="gray.500"
              _hover={{ bg: 'gray.50', color: 'gray.600' }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
            />
          </HStack>
        ) : (
          <ConversationMenu
            conversationId={conversation.id}
            currentProjectId={projectId}
            onRename={() => onStart()}
            onDelete={() => onDeleteConversation(conversation.id)}
            updatedAt={conversation.updatedAt}
          />
        )}
      </Box>
    </HStack>
  )
}

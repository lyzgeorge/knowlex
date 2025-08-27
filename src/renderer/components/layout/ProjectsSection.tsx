import React, { useState, useCallback } from 'react'
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
import DeleteProjectModal from '@renderer/components/ui/DeleteProjectModal'
import { useConversationStore } from '@renderer/stores/conversation'
import ConversationMenu from '@renderer/components/ui/ConversationMenu'
import { HiPlus, HiCheck, HiXMark, HiBars3, HiFolder, HiFolderOpen } from 'react-icons/hi2'
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
  const projectManagement = useProjectManagement()
  const { messages, conversations } = useConversationStore()

  const updateConversationTitle = useConversationStore((s) => s.updateConversationTitle)

  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const startEdit = useCallback((id: string, title: string) => {
    setEditingConversationId(id)
    setEditingTitle(title)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingConversationId(null)
    setEditingTitle('')
  }, [])

  const confirmEdit = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return
    try {
      await updateConversationTitle(editingConversationId, editingTitle.trim())
    } catch (err) {
      console.error('Failed to rename conversation:', err)
    } finally {
      cancelEdit()
    }
  }, [editingConversationId, editingTitle, updateConversationTitle, cancelEdit])

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (editingConversationId) cancelEdit()
    }, 150)
  }, [editingConversationId, cancelEdit])

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
            icon={<HiCheck />}
            size="xs"
            variant="ghost"
            isDisabled={!newProjectName.trim()}
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
                      icon={<HiCheck />}
                      size="xs"
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation()
                        await handleConfirmEditProject(p.id)
                      }}
                    />
                    <IconButton
                      aria-label="Cancel rename"
                      icon={<HiXMark />}
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
                    const isEditing = editingConversationId === conversation.id
                    return (
                      <HStack
                        key={conversation.id}
                        role="listitem"
                        p={2}
                        pl={2}
                        borderRadius="md"
                        cursor="pointer"
                        bg={isCurrent ? 'primary.50' : 'transparent'}
                        borderLeft={isCurrent ? '3px solid' : 'none'}
                        borderColor="primary.500"
                        transition="all 0.2s"
                        _hover={{ bg: isCurrent ? 'primary.100' : 'surface.hover' }}
                        onClick={() => onSelectConversation(conversation.id)}
                        justify="space-between"
                        align="center"
                      >
                        {isEditing ? (
                          <HStack flex={1} spacing={1}>
                            <Input
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
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
                                  confirmEdit()
                                } else if (e.key === 'Escape') {
                                  e.preventDefault()
                                  cancelEdit()
                                }
                              }}
                              onBlur={handleInputBlur}
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
                            border="1px solid"
                            borderColor="border.primary"
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
                          {isEditing ? (
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
                                  confirmEdit()
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
                                  cancelEdit()
                                }}
                              />
                            </HStack>
                          ) : (
                            <ConversationMenu
                              conversationId={conversation.id}
                              currentProjectId={p.id}
                              onRename={() => startEdit(conversation.id, conversation.title)}
                              onDelete={() => onDeleteConversation(conversation.id)}
                              updatedAt={conversation.updatedAt}
                            />
                          )}
                        </Box>
                      </HStack>
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

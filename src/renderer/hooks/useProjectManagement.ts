import { useState, useCallback, useEffect } from 'react'
import { useDisclosure } from '@chakra-ui/react'
import { useProjectStore } from '@renderer/stores/project'
import { ensureNonEmptyString } from '@renderer/utils/validation'
import { useNavigationActions } from '@renderer/stores/navigation'

export function useProjectManagement() {
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = useState('')
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<{
    id: string
    name: string
  } | null>(null)

  const {
    isOpen: isDeleteProjectOpen,
    onOpen: onOpenDeleteProject,
    onClose: onCloseDeleteProject
  } = useDisclosure()

  const {
    projects,
    expanded,
    toggle: toggleProject,
    fetchProjects,
    addProject,
    editProject,
    removeProject
  } = useProjectStore()

  const { openProject } = useNavigationActions()

  useEffect(() => {
    fetchProjects().catch(() => {})
  }, [fetchProjects])

  const handleCreateProject = useCallback(async () => {
    try {
      const name = ensureNonEmptyString(newProjectName, 'Project name')
      const proj = await addProject(name)
      setIsCreatingProject(false)
      setNewProjectName('')
      openProject(proj.id)
    } catch {
      // noop; UI already guards; keep behavior consistent
    }
  }, [newProjectName, addProject, openProject])

  const handleStartCreateProject = useCallback(() => {
    setIsCreatingProject(true)
    setNewProjectName('')
  }, [])

  const handleCancelCreateProject = useCallback(() => {
    setIsCreatingProject(false)
    setNewProjectName('')
  }, [])

  const handleStartEditProject = useCallback((projectId: string, currentName: string) => {
    setEditingProjectId(projectId)
    setEditingProjectName(currentName)
  }, [])

  const handleConfirmEditProject = useCallback(
    async (projectId: string) => {
      try {
        const name = ensureNonEmptyString(editingProjectName, 'Project name')
        await editProject(projectId, name)
        setEditingProjectId(null)
        setEditingProjectName('')
      } catch {
        // noop; keep UX consistent
      }
    },
    [editingProjectName, editProject]
  )

  const handleCancelEditProject = useCallback(() => {
    setEditingProjectId(null)
    setEditingProjectName('')
  }, [])

  const handleDeleteProject = useCallback(
    (projectId: string, projectName: string) => {
      setProjectPendingDeletion({ id: projectId, name: projectName })
      onOpenDeleteProject()
    },
    [onOpenDeleteProject]
  )

  const handleConfirmDeleteProject = useCallback(async () => {
    if (!projectPendingDeletion) return
    await removeProject(projectPendingDeletion.id)
    setProjectPendingDeletion(null)
    onCloseDeleteProject()
  }, [projectPendingDeletion, removeProject, onCloseDeleteProject])

  const handleCloseDeleteProject = useCallback(() => {
    setProjectPendingDeletion(null)
    onCloseDeleteProject()
  }, [onCloseDeleteProject])

  return {
    // Project data
    projects,
    expanded,
    toggleProject,

    // Create project
    isCreatingProject,
    newProjectName,
    setNewProjectName,
    handleCreateProject,
    handleStartCreateProject,
    handleCancelCreateProject,

    // Edit project
    editingProjectId,
    editingProjectName,
    setEditingProjectName,
    handleStartEditProject,
    handleConfirmEditProject,
    handleCancelEditProject,

    // Delete project
    projectPendingDeletion,
    isDeleteProjectOpen,
    handleDeleteProject,
    handleConfirmDeleteProject,
    handleCloseDeleteProject
  }
}

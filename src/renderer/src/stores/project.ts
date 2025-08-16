/**
 * Project state store for Knowlex Desktop Application
 * Manages project data, CRUD operations, and project-related state
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Project, ProjectFile, ProjectMemory, ProjectNote } from '../../../shared/types'

export interface ProjectState {
  // Data state
  projects: Project[]
  currentProjectId: string | null

  // Loading states
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean

  // Error state
  error: string | null

  // CRUD operations
  createProject: (data: CreateProjectData) => Promise<Project>
  updateProject: (id: string, data: UpdateProjectData) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  loadProjects: () => Promise<void>

  // Selection
  setCurrentProject: (projectId: string | null) => void
  getCurrentProject: () => Project | null

  // Project files management
  uploadFiles: (projectId: string, files: File[]) => Promise<ProjectFile[]>
  deleteFile: (fileId: string) => Promise<void>
  retryFileProcessing: (fileId: string) => Promise<void>

  // Project memory management
  addMemory: (projectId: string, content: string) => Promise<ProjectMemory>
  updateMemory: (memoryId: string, content: string) => Promise<void>
  deleteMemory: (memoryId: string) => Promise<void>
  reorderMemories: (projectId: string, memoryIds: string[]) => Promise<void>

  // Project notes management
  addNote: (
    projectId: string,
    title: string,
    content: string,
    tags?: string[]
  ) => Promise<ProjectNote>
  updateNote: (noteId: string, data: Partial<ProjectNote>) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>

  // Statistics
  refreshProjectStats: (projectId: string) => Promise<void>

  // Utilities
  clearError: () => void
  reset: () => void
  initialize: () => Promise<void>
}

export interface CreateProjectData {
  name: string
  description?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
}

const initialState = {
  projects: [], // Start with empty, load from DB
  currentProjectId: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    ...initialState,

    // CRUD Operations
    createProject: async (data: CreateProjectData) => {
      set((state) => {
        state.isCreating = true
        state.error = null
      })

      try {
        // This will be implemented when IPC is set up
        const newProject = await window.electronAPI?.invoke('project:create', data)

        set((state) => {
          state.projects.push(newProject)
          state.currentProjectId = newProject.id
          state.isCreating = false
        })

        return newProject
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create project'
          state.isCreating = false
        })
        throw error
      }
    },

    updateProject: async (id: string, data: UpdateProjectData) => {
      set((state) => {
        state.isUpdating = true
        state.error = null
      })

      try {
        await window.electronAPI?.invoke('project:update', id, data)

        set((state) => {
          const projectIndex = state.projects.findIndex((p) => p.id === id)
          if (projectIndex !== -1) {
            Object.assign(state.projects[projectIndex], data, {
              updatedAt: new Date().toISOString()
            })
          }
          state.isUpdating = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to update project'
          state.isUpdating = false
        })
        throw error
      }
    },

    deleteProject: async (id: string) => {
      set((state) => {
        state.isDeleting = true
        state.error = null
      })

      try {
        await window.electronAPI?.invoke('project:delete', id)

        set((state) => {
          state.projects = state.projects.filter((p) => p.id !== id)
          if (state.currentProjectId === id) {
            state.currentProjectId = null
          }
          state.isDeleting = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete project'
          state.isDeleting = false
        })
        throw error
      }
    },

    loadProjects: async () => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        const projects = (await window.electronAPI?.invoke('project:list')) || []

        set((state) => {
          state.projects = projects
          state.isLoading = false
        })
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to load projects'
          state.isLoading = false
        })
      }
    },

    // Selection
    setCurrentProject: (projectId: string | null) => {
      set((state) => {
        state.currentProjectId = projectId
      })
    },

    getCurrentProject: () => {
      const state = get()
      return state.projects.find((p) => p.id === state.currentProjectId) || null
    },

    // File Management
    uploadFiles: async (projectId: string, files: File[]) => {
      try {
        const uploadedFiles =
          (await window.electronAPI?.invoke('file:upload', projectId, files)) || []

        // Update project stats
        await get().refreshProjectStats(projectId)

        return uploadedFiles
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to upload files'
        })
        throw error
      }
    },

    deleteFile: async (fileId: string) => {
      try {
        await window.electronAPI?.invoke('file:delete', fileId)

        // Find the project that owns this file and refresh its stats
        const project = get().projects.find((p) => p.stats && p.stats.fileCount > 0)

        if (project) {
          await get().refreshProjectStats(project.id)
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete file'
        })
        throw error
      }
    },

    retryFileProcessing: async (fileId: string) => {
      try {
        await window.electronAPI?.invoke('file:retry', fileId)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to retry file processing'
        })
        throw error
      }
    },

    // Memory Management
    addMemory: async (projectId: string, content: string) => {
      try {
        const memory = await window.electronAPI?.invoke('project:add-memory', projectId, content)
        return memory
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to add memory'
        })
        throw error
      }
    },

    updateMemory: async (memoryId: string, content: string) => {
      try {
        await window.electronAPI?.invoke('project:update-memory', memoryId, content)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to update memory'
        })
        throw error
      }
    },

    deleteMemory: async (memoryId: string) => {
      try {
        await window.electronAPI?.invoke('project:delete-memory', memoryId)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete memory'
        })
        throw error
      }
    },

    reorderMemories: async (projectId: string, memoryIds: string[]) => {
      try {
        await window.electronAPI?.invoke('project:reorder-memories', projectId, memoryIds)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to reorder memories'
        })
        throw error
      }
    },

    // Notes Management
    addNote: async (projectId: string, title: string, content: string, tags: string[] = []) => {
      try {
        const note = await window.electronAPI?.invoke('project:add-note', projectId, {
          title,
          content,
          tags
        })
        return note
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to add note'
        })
        throw error
      }
    },

    updateNote: async (noteId: string, data: Partial<ProjectNote>) => {
      try {
        await window.electronAPI?.invoke('project:update-note', noteId, data)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to update note'
        })
        throw error
      }
    },

    deleteNote: async (noteId: string) => {
      try {
        await window.electronAPI?.invoke('project:delete-note', noteId)
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete note'
        })
        throw error
      }
    },

    // Statistics
    refreshProjectStats: async (projectId: string) => {
      try {
        const stats = await window.electronAPI?.invoke('project:get-stats', projectId)

        set((state) => {
          const projectIndex = state.projects.findIndex((p) => p.id === projectId)
          if (projectIndex !== -1) {
            state.projects[projectIndex].stats = stats
          }
        })
      } catch (error) {
        // Don't set error state for stats refresh failures
        console.warn('Failed to refresh project stats:', error)
      }
    },

    // Utilities
    clearError: () => {
      set((state) => {
        state.error = null
      })
    },

    reset: () => {
      set((state) => {
        Object.assign(state, initialState)
      })
    },

    // Initialize store by loading projects from database
    initialize: async () => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        // Load projects from database
        const result = await window.electronAPI?.invoke('project:list')

        if (result?.success) {
          set((state) => {
            state.projects = result.data || []
            state.isLoading = false
          })
        } else {
          // If database is empty, start with empty state
          set((state) => {
            state.projects = []
            state.isLoading = false
          })
        }
      } catch (error) {
        console.error('Failed to initialize projects:', error)
        set((state) => {
          state.projects = []
          state.isLoading = false
          state.error = error instanceof Error ? error.message : 'Failed to load projects'
        })
      }
    }
  }))
)

// Convenience hooks for common use cases
export const useCurrentProject = () =>
  useProjectStore((state) => ({
    currentProject: state.getCurrentProject(),
    setCurrentProject: state.setCurrentProject
  }))

export const useProjects = () =>
  useProjectStore((state) => ({
    projects: state.projects,
    isLoading: state.isLoading,
    error: state.error,
    loadProjects: state.loadProjects,
    clearError: state.clearError
  }))

// Individual selectors to prevent re-render loops
export const useCreateProject = () => useProjectStore((state) => state.createProject)
export const useUpdateProject = () => useProjectStore((state) => state.updateProject)
export const useDeleteProject = () => useProjectStore((state) => state.deleteProject)
export const useIsCreating = () => useProjectStore((state) => state.isCreating)
export const useIsUpdating = () => useProjectStore((state) => state.isUpdating)
export const useIsDeleting = () => useProjectStore((state) => state.isDeleting)

// Global declarations for electron API (will be properly typed later)
declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

export default useProjectStore

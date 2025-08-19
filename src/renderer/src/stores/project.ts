/**
 * Simplified Project state store for Knowlex Desktop Application
 * Only handles basic project listing and selection (what's actually being used)
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Project } from '../../../shared/types'

export interface ProjectState {
  // Data state
  projects: Project[]
  currentProjectId: string | null

  // Loading states
  isLoading: boolean
  error: string | null

  // Basic operations
  loadProjects: () => Promise<void>
  setCurrentProject: (projectId: string | null) => void
  getCurrentProject: () => Project | null

  // Utilities
  clearError: () => void
  reset: () => void
  initialize: () => Promise<void>
}

const initialState = {
  projects: [], // Start with empty, load from DB
  currentProjectId: null,
  isLoading: false,
  error: null
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    ...initialState,

    // Basic operations
    loadProjects: async () => {
      set((state) => {
        state.isLoading = true
        state.error = null
      })

      try {
        const result = (await window.electronAPI?.invoke('project:list')) as {
          success: boolean
          data?: any[]
        }

        if (result?.success) {
          set((state) => {
            state.projects = result.data || []
            state.isLoading = false
          })
        } else {
          set((state) => {
            state.projects = []
            state.isLoading = false
          })
        }
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
      try {
        await get().loadProjects()
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

// Global declarations for electron API (will be properly typed later)
declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    }
  }
}

export default useProjectStore

/**
 * Navigation state store for Knowlex Desktop Application
 * Manages app navigation between different views and pages
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useConversationStore } from './conversation'

export type MainView = 'chat' | 'project-list' | 'project-detail' | 'project-files' | 'settings'

export interface NavigationState {
  // Current view state
  currentView: MainView

  // Project-specific navigation
  selectedProjectId: string | null

  // Navigation stack for back navigation
  navigationHistory: Array<{
    view: MainView
    projectId?: string
    timestamp: number
  }>

  // Actions
  navigateTo: (view: MainView, projectId?: string) => void
  navigateBack: () => void
  navigateToProjectFiles: (projectId: string) => void
  navigateToProjectDetail: (projectId: string) => void
  navigateToProjectList: () => void
  navigateToChat: (projectId?: string) => void
  clearHistory: () => void

  // Utilities
  canGoBack: () => boolean
  getPreviousView: () => { view: MainView; projectId?: string } | null
}

const initialState = {
  currentView: 'chat' as MainView,
  selectedProjectId: null,
  navigationHistory: []
}

export const useNavigationStore = create<NavigationState>()(
  immer((set, get) => ({
    ...initialState,

    navigateTo: (view: MainView, projectId?: string) => {
      set((state) => {
        // Add current state to history before navigating
        if (state.currentView !== view || state.selectedProjectId !== projectId) {
          const historyEntry: { view: MainView; projectId?: string; timestamp: number } = {
            view: state.currentView,
            timestamp: Date.now()
          }
          if (state.selectedProjectId) {
            historyEntry.projectId = state.selectedProjectId
          }
          state.navigationHistory.push(historyEntry)

          // Limit history to 20 items
          if (state.navigationHistory.length > 20) {
            state.navigationHistory.shift()
          }
        }

        state.currentView = view
        state.selectedProjectId = projectId || null
      })

      // If navigating away from a chat-centric view, clear the active conversation
      if (view !== 'chat') {
        setTimeout(() => {
          useConversationStore.getState().setCurrentConversation(null)
        }, 0)
      }
    },

    navigateBack: () => {
      set((state) => {
        if (state.navigationHistory.length > 0) {
          const previousState = state.navigationHistory.pop()!
          state.currentView = previousState.view
          state.selectedProjectId = previousState.projectId || null
        }
      })
    },

    navigateToProjectFiles: (projectId: string) => {
      get().navigateTo('project-files', projectId)
    },

    navigateToProjectDetail: (projectId: string) => {
      get().navigateTo('project-detail', projectId)
    },

    navigateToProjectList: () => {
      get().navigateTo('project-list')
    },

    navigateToChat: (projectId?: string) => {
      get().navigateTo('chat', projectId)
    },

    clearHistory: () => {
      set((state) => {
        state.navigationHistory = []
      })
    },

    canGoBack: () => {
      return get().navigationHistory.length > 0
    },

    getPreviousView: () => {
      const history = get().navigationHistory
      if (history.length === 0) return null

      const previous = history[history.length - 1]
      if (!previous) return null
      const result: { view: MainView; projectId?: string } = {
        view: previous.view
      }
      if (previous.projectId) {
        result.projectId = previous.projectId
      }
      return result
    }
  }))
)

// Convenience hooks with stable selectors
export const useCurrentView = () => {
  const currentView = useNavigationStore((state) => state.currentView)
  const selectedProjectId = useNavigationStore((state) => state.selectedProjectId)
  return { currentView, selectedProjectId }
}

export const useNavigationActions = () => {
  const navigateTo = useNavigationStore((state) => state.navigateTo)
  const navigateBack = useNavigationStore((state) => state.navigateBack)
  const navigateToProjectFiles = useNavigationStore((state) => state.navigateToProjectFiles)
  const navigateToProjectDetail = useNavigationStore((state) => state.navigateToProjectDetail)
  const navigateToProjectList = useNavigationStore((state) => state.navigateToProjectList)
  const navigateToChat = useNavigationStore((state) => state.navigateToChat)
  const canGoBack = useNavigationStore((state) => state.canGoBack)
  const getPreviousView = useNavigationStore((state) => state.getPreviousView)

  return {
    navigateTo,
    navigateBack,
    navigateToProjectFiles,
    navigateToProjectDetail,
    navigateToProjectList,
    navigateToChat,
    canGoBack,
    getPreviousView
  }
}

export default useNavigationStore

/**
 * Navigation state store for Knowlex Desktop Application
 * Manages app navigation between different views and pages
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useConversationStore } from './conversation'

export type MainView = 'home' | 'project' | 'conversation'

export interface NavigationState {
  // Current view state
  currentView: MainView

  // Project-specific navigation
  selectedProjectId: string | null

  // Current conversation ID
  currentConversationId: string | null

  // Navigation stack for back navigation
  navigationHistory: Array<{
    view: MainView
    projectId?: string
    conversationId?: string
    timestamp: number
  }>

  // Simplified actions
  goHome: () => void
  openProject: (projectId: string) => void
  openConversation: (conversationId: string, projectId?: string | null) => void
  navigateBack: () => void
  clearHistory: () => void

  // Utilities
  canGoBack: () => boolean
  getPreviousView: () => { view: MainView; projectId?: string; conversationId?: string } | null
}

const initialState = {
  currentView: 'home' as MainView,
  selectedProjectId: null,
  currentConversationId: null,
  navigationHistory: []
}

export const useNavigationStore = create<NavigationState>()(
  immer((set, get) => ({
    ...initialState,

    goHome: () => {
      set((state) => {
        // Add current state to history
        if (state.currentView !== 'home') {
          const historyEntry: {
            view: MainView
            projectId?: string
            conversationId?: string
            timestamp: number
          } = {
            view: state.currentView,
            timestamp: Date.now()
          }
          if (state.selectedProjectId) {
            historyEntry.projectId = state.selectedProjectId
          }
          if (state.currentConversationId) {
            historyEntry.conversationId = state.currentConversationId
          }
          state.navigationHistory.push(historyEntry)

          // Limit history to 20 items
          if (state.navigationHistory.length > 20) {
            state.navigationHistory.shift()
          }
        }

        state.currentView = 'home'
        state.selectedProjectId = null
        state.currentConversationId = null
      })

      // Clear conversation selection
      useConversationStore.getState().setCurrentConversation(null)
    },

    openProject: (projectId: string) => {
      set((state) => {
        // Add current state to history
        if (state.currentView !== 'project' || state.selectedProjectId !== projectId) {
          const historyEntry: {
            view: MainView
            projectId?: string
            conversationId?: string
            timestamp: number
          } = {
            view: state.currentView,
            timestamp: Date.now()
          }
          if (state.selectedProjectId) {
            historyEntry.projectId = state.selectedProjectId
          }
          if (state.currentConversationId) {
            historyEntry.conversationId = state.currentConversationId
          }
          state.navigationHistory.push(historyEntry)

          // Limit history to 20 items
          if (state.navigationHistory.length > 20) {
            state.navigationHistory.shift()
          }
        }

        state.currentView = 'project'
        state.selectedProjectId = projectId
        state.currentConversationId = null
      })

      // Clear conversation selection when viewing project
      useConversationStore.getState().setCurrentConversation(null)
    },

    openConversation: (conversationId: string, projectId?: string | null) => {
      set((state) => {
        // Add current state to history
        if (
          state.currentView !== 'conversation' ||
          state.currentConversationId !== conversationId
        ) {
          const historyEntry: {
            view: MainView
            projectId?: string
            conversationId?: string
            timestamp: number
          } = {
            view: state.currentView,
            timestamp: Date.now()
          }
          if (state.selectedProjectId) {
            historyEntry.projectId = state.selectedProjectId
          }
          if (state.currentConversationId) {
            historyEntry.conversationId = state.currentConversationId
          }
          state.navigationHistory.push(historyEntry)

          // Limit history to 20 items
          if (state.navigationHistory.length > 20) {
            state.navigationHistory.shift()
          }
        }

        state.currentView = 'conversation'
        state.selectedProjectId = projectId || null
        state.currentConversationId = conversationId
      })

      // Set conversation in store
      useConversationStore.getState().setCurrentConversation(conversationId)
    },

    navigateBack: () => {
      set((state) => {
        if (state.navigationHistory.length > 0) {
          const previousState = state.navigationHistory.pop()!
          state.currentView = previousState.view
          state.selectedProjectId = previousState.projectId || null
          state.currentConversationId = previousState.conversationId || null

          // Update conversation store if needed
          if (previousState.conversationId) {
            useConversationStore.getState().setCurrentConversation(previousState.conversationId)
          } else {
            useConversationStore.getState().setCurrentConversation(null)
          }
        }
      })
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
      const result: { view: MainView; projectId?: string; conversationId?: string } = {
        view: previous.view
      }
      if (previous.projectId) {
        result.projectId = previous.projectId
      }
      if (previous.conversationId) {
        result.conversationId = previous.conversationId
      }
      return result
    }
  }))
)

// Convenience hooks with stable selectors
export const useCurrentView = () => {
  const currentView = useNavigationStore((state) => state.currentView)
  const selectedProjectId = useNavigationStore((state) => state.selectedProjectId)
  const currentConversationId = useNavigationStore((state) => state.currentConversationId)
  return { currentView, selectedProjectId, currentConversationId }
}

export const useNavigationActions = () => {
  const goHome = useNavigationStore((state) => state.goHome)
  const openProject = useNavigationStore((state) => state.openProject)
  const openConversation = useNavigationStore((state) => state.openConversation)
  const navigateBack = useNavigationStore((state) => state.navigateBack)
  const canGoBack = useNavigationStore((state) => state.canGoBack)
  const getPreviousView = useNavigationStore((state) => state.getPreviousView)

  return {
    goHome,
    openProject,
    openConversation,
    navigateBack,
    canGoBack,
    getPreviousView
  }
}

export default useNavigationStore

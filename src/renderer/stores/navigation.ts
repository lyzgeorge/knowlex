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

  // Settings modal state
  isSettingsOpen: boolean
  settingsDefaultTab: number

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
  openSettings: (defaultTab?: number) => void
  closeSettings: () => void
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
  isSettingsOpen: false,
  settingsDefaultTab: 0,
  navigationHistory: []
}

export const useNavigationStore = create<NavigationState>()(
  immer((set, get) => {
    // Internal helper to push a history entry and enforce limits
    const _pushHistory = (state: any, shouldPush: boolean) => {
      if (!shouldPush) return
      const entry: any = { view: state.currentView, timestamp: Date.now() }
      if (state.selectedProjectId) entry.projectId = state.selectedProjectId
      if (state.currentConversationId) entry.conversationId = state.currentConversationId
      state.navigationHistory.push(entry)
      if (state.navigationHistory.length > 20) state.navigationHistory.shift()
    }

    const impl: NavigationState = {
      ...initialState,

      goHome: () => {
        set((state) => {
          _pushHistory(state, state.currentView !== 'home')
          state.currentView = 'home'
          state.selectedProjectId = null
          state.currentConversationId = null
        })

        useConversationStore.getState().setCurrentConversation(null)
      },

      openProject: (projectId: string) => {
        set((state) => {
          _pushHistory(
            state,
            state.currentView !== 'project' || state.selectedProjectId !== projectId
          )
          state.currentView = 'project'
          state.selectedProjectId = projectId
          state.currentConversationId = null
        })

        useConversationStore.getState().setCurrentConversation(null)
      },

      openConversation: (conversationId: string, projectId?: string | null) => {
        set((state) => {
          _pushHistory(
            state,
            state.currentView !== 'conversation' || state.currentConversationId !== conversationId
          )
          state.currentView = 'conversation'
          state.selectedProjectId = projectId || null
          state.currentConversationId = conversationId
        })

        useConversationStore.getState().setCurrentConversation(conversationId)
      },

      openSettings: (defaultTab = 0) => {
        set((state) => {
          state.isSettingsOpen = true
          state.settingsDefaultTab = defaultTab
        })
      },

      closeSettings: () => {
        set((state) => {
          state.isSettingsOpen = false
          state.settingsDefaultTab = 0
        })
      },

      navigateBack: () => {
        set((state) => {
          if (state.navigationHistory.length > 0) {
            const previousState = state.navigationHistory.pop()!
            state.currentView = previousState.view
            state.selectedProjectId = previousState.projectId || null
            state.currentConversationId = previousState.conversationId || null

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
    }

    return impl
  })
)

// Convenience hooks with stable selectors
export const useCurrentView = () => {
  const currentView = useNavigationStore((state) => state.currentView)
  const selectedProjectId = useNavigationStore((state) => state.selectedProjectId)
  const currentConversationId = useNavigationStore((state) => state.currentConversationId)
  return { currentView, selectedProjectId, currentConversationId }
}

export const useSettingsModal = () => {
  const isSettingsOpen = useNavigationStore((state) => state.isSettingsOpen)
  const settingsDefaultTab = useNavigationStore((state) => state.settingsDefaultTab)
  return { isSettingsOpen, settingsDefaultTab }
}

export const useNavigationActions = () => {
  const goHome = useNavigationStore((state) => state.goHome)
  const openProject = useNavigationStore((state) => state.openProject)
  const openConversation = useNavigationStore((state) => state.openConversation)
  const openSettings = useNavigationStore((state) => state.openSettings)
  const closeSettings = useNavigationStore((state) => state.closeSettings)
  const navigateBack = useNavigationStore((state) => state.navigateBack)
  const canGoBack = useNavigationStore((state) => state.canGoBack)
  const getPreviousView = useNavigationStore((state) => state.getPreviousView)

  return {
    goHome,
    openProject,
    openConversation,
    openSettings,
    closeSettings,
    navigateBack,
    canGoBack,
    getPreviousView,
    openGeneralSettings: () => openSettings(0), // General tab is first tab
    openModelsSettings: () => openSettings(1) // Models tab is second tab
  }
}

export default useNavigationStore

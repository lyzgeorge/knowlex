/**
 * Application state store for Knowlex Desktop Application
 * Manages global UI state, theme, language, and sidebar settings
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { themeManager, type ColorMode } from '@renderer/utils/theme/colorMode'

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'zh-CN' | 'zh-TW'

export interface AppState {
  // UI State
  theme: ColorMode
  resolvedTheme: 'light' | 'dark'
  language: Language
  showSidebar: boolean
  sidebarWidth: number
  isFullscreen: boolean

  // Application State
  isInitialized: boolean
  isOnline: boolean
  lastSyncTime: Date | null

  // Actions
  setTheme: (theme: ColorMode) => void
  setLanguage: (language: Language) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setFullscreen: (fullscreen: boolean) => void
  setInitialized: (initialized: boolean) => void
  setOnlineStatus: (online: boolean) => void
  setLastSyncTime: (time: Date) => void

  // Computed getters
  isSidebarCollapsed: () => boolean

  // Utility actions
  reset: () => void
}

const initialState = {
  theme: 'system' as ColorMode,
  resolvedTheme: 'light' as const,
  language: 'en' as Language,
  showSidebar: true,
  sidebarWidth: 280,
  isFullscreen: false,
  isInitialized: false,
  isOnline: navigator.onLine,
  lastSyncTime: null
}

export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Theme management
      setTheme: (theme: ColorMode) => {
        set((state) => {
          state.theme = theme
        })
        themeManager.setColorMode(theme)
      },

      // Language management
      setLanguage: (language: Language) => {
        set((state) => {
          state.language = language
        })
      },

      // Sidebar management
      toggleSidebar: () => {
        set((state) => {
          state.showSidebar = !state.showSidebar
        })
      },

      setSidebarWidth: (width: number) => {
        set((state) => {
          // Constrain width between 200px and 500px
          state.sidebarWidth = Math.max(200, Math.min(500, width))
        })
      },

      // Fullscreen management
      setFullscreen: (fullscreen: boolean) => {
        set((state) => {
          state.isFullscreen = fullscreen
        })
      },

      // Application lifecycle
      setInitialized: (initialized: boolean) => {
        set((state) => {
          state.isInitialized = initialized
        })
      },

      // Network status
      setOnlineStatus: (online: boolean) => {
        set((state) => {
          state.isOnline = online
        })
      },

      // Sync management
      setLastSyncTime: (time: Date) => {
        set((state) => {
          state.lastSyncTime = time
        })
      },

      // Computed getters
      isSidebarCollapsed: () => {
        const state = get()
        return state.sidebarWidth < 240
      },

      // Reset to defaults
      reset: () => {
        set((state) => {
          Object.assign(state, initialState)
        })
      }
    })),
    {
      name: 'knowlex-app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        theme: state.theme,
        language: state.language,
        showSidebar: state.showSidebar,
        sidebarWidth: state.sidebarWidth,
        isFullscreen: state.isFullscreen
      })
    }
  )
)

// Initialize theme manager synchronization
let themeUnsubscribe: (() => void) | null = null

// Initialize theme synchronization in a safe way
export const initializeThemeSync = () => {
  if (themeUnsubscribe) return // Already initialized

  // Set initial resolved theme
  useAppStore.setState({ resolvedTheme: themeManager.getResolvedTheme() })

  // Subscribe to theme changes (don't call immediately since we set it above)
  themeUnsubscribe = themeManager.subscribe((resolvedTheme) => {
    useAppStore.setState({ resolvedTheme })
  }, false)
}

// Cleanup function
export const cleanupThemeSync = () => {
  if (themeUnsubscribe) {
    themeUnsubscribe()
    themeUnsubscribe = null
  }
}

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnlineStatus(true)
  })

  window.addEventListener('offline', () => {
    useAppStore.getState().setOnlineStatus(false)
  })
}

// Utility hooks for common use cases
export const useTheme = () =>
  useAppStore((state) => ({
    theme: state.theme,
    resolvedTheme: state.resolvedTheme,
    setTheme: state.setTheme
  }))

export const useLanguage = () =>
  useAppStore((state) => ({
    language: state.language,
    setLanguage: state.setLanguage
  }))

export const useSidebar = () =>
  useAppStore((state) => ({
    showSidebar: state.showSidebar,
    sidebarWidth: state.sidebarWidth,
    isSidebarCollapsed: state.isSidebarCollapsed(),
    toggleSidebar: state.toggleSidebar,
    setSidebarWidth: state.setSidebarWidth
  }))

export const useAppStatus = () =>
  useAppStore((state) => ({
    isInitialized: state.isInitialized,
    isOnline: state.isOnline,
    lastSyncTime: state.lastSyncTime
  }))

export default useAppStore

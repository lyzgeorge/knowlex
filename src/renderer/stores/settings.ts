/**
 * Settings state store for Knowlex Desktop Application
 * Manages application settings, API configurations, and user preferences
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface APIProvider {
  id: string
  name: string
  provider: 'openai' | 'claude' | 'local'
  apiKey?: string
  baseURL?: string
  model: string
  maxTokens?: number
  temperature?: number
  isDefault: boolean
  isEnabled: boolean
}

export interface GeneralSettings {
  language: 'en' | 'zh-CN' | 'zh-TW'
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  autoBackup: boolean
  maxFileSize: number // in bytes
  maxFilesPerUpload: number
  defaultProjectLocation?: string
  enableAnalytics: boolean
  enableErrorReporting: boolean
}

export interface ShortcutSettings {
  newChat: string
  newProject: string
  search: string
  settings: string
  toggleSidebar: string
  focusInput: string
  saveNote: string
  quickExport: string
}

export interface AdvancedSettings {
  developerMode: boolean
  debugLogging: boolean
  enableExperimentalFeatures: boolean
  customCSSPath?: string
  proxyURL?: string
  maxConcurrentRequests: number
  requestTimeout: number
  enableAutoLaunch: boolean
}

export interface SettingsState {
  // Settings data
  apiProviders: APIProvider[]
  generalSettings: GeneralSettings
  shortcutSettings: ShortcutSettings
  advancedSettings: AdvancedSettings

  // State flags
  isLoading: boolean
  isSaving: boolean
  isTesting: boolean
  hasUnsavedChanges: boolean

  // Error state
  error: string | null
  testResults: Record<string, { success: boolean; message: string }>

  // Actions
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  resetToDefaults: (section?: 'api' | 'general' | 'shortcuts' | 'advanced') => Promise<void>

  // API Provider management
  addAPIProvider: (provider: Omit<APIProvider, 'id'>) => void
  updateAPIProvider: (id: string, updates: Partial<APIProvider>) => void
  removeAPIProvider: (id: string) => void
  setDefaultProvider: (id: string) => void
  testAPIProvider: (id: string) => Promise<boolean>

  // Settings updates
  updateGeneralSettings: (updates: Partial<GeneralSettings>) => void
  updateShortcutSettings: (updates: Partial<ShortcutSettings>) => void
  updateAdvancedSettings: (updates: Partial<AdvancedSettings>) => void

  // Validation
  validateSettings: () => { isValid: boolean; errors: string[] }

  // Utilities
  markAsChanged: () => void
  clearChanges: () => void
  clearError: () => void
  getDefaultProvider: () => APIProvider | null
}

const defaultGeneralSettings: GeneralSettings = {
  language: 'en',
  theme: 'system',
  autoSave: true,
  autoBackup: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFilesPerUpload: 10,
  enableAnalytics: false,
  enableErrorReporting: true
}

const defaultShortcutSettings: ShortcutSettings = {
  newChat: 'Cmd+N',
  newProject: 'Cmd+Shift+N',
  search: 'Cmd+K',
  settings: 'Cmd+,',
  toggleSidebar: 'Cmd+B',
  focusInput: 'Cmd+L',
  saveNote: 'Cmd+S',
  quickExport: 'Cmd+E'
}

const defaultAdvancedSettings: AdvancedSettings = {
  developerMode: false,
  debugLogging: false,
  enableExperimentalFeatures: false,
  maxConcurrentRequests: 5,
  requestTimeout: 30000, // 30 seconds
  enableAutoLaunch: false
}

const initialState = {
  apiProviders: [],
  generalSettings: defaultGeneralSettings,
  shortcutSettings: defaultShortcutSettings,
  advancedSettings: defaultAdvancedSettings,
  isLoading: false,
  isSaving: false,
  isTesting: false,
  hasUnsavedChanges: false,
  error: null,
  testResults: {}
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Load settings from backend
      loadSettings: async () => {
        set((state) => {
          state.isLoading = true
          state.error = null
        })

        try {
          // Check if knowlex API is available
          if (!window.knowlex) {
            // Fallback to default settings in browser/development mode
            console.warn('Knowlex API not available, using default settings')
            set((state) => {
              state.apiProviders = []
              state.generalSettings = { ...defaultGeneralSettings }
              state.shortcutSettings = { ...defaultShortcutSettings }
              state.advancedSettings = { ...defaultAdvancedSettings }
              state.isLoading = false
              state.hasUnsavedChanges = false
            })
            return
          }

          const [apiProviders, generalSettings, shortcutSettings, advancedSettings] =
            await Promise.all([
              window.knowlex.settings
                .get('api-providers')
                .then((result) => (result.success ? result.data : []))
                .catch(() => []),
              window.knowlex.settings
                .get('general')
                .then((result) => (result.success ? result.data : defaultGeneralSettings))
                .catch(() => defaultGeneralSettings),
              window.knowlex.settings
                .get('shortcuts')
                .then((result) => (result.success ? result.data : defaultShortcutSettings))
                .catch(() => defaultShortcutSettings),
              window.knowlex.settings
                .get('advanced')
                .then((result) => (result.success ? result.data : defaultAdvancedSettings))
                .catch(() => defaultAdvancedSettings)
            ])

          set((state) => {
            state.apiProviders = Array.isArray(apiProviders) ? apiProviders : []
            state.generalSettings = { ...defaultGeneralSettings, ...(generalSettings || {}) }
            state.shortcutSettings = { ...defaultShortcutSettings, ...(shortcutSettings || {}) }
            state.advancedSettings = { ...defaultAdvancedSettings, ...(advancedSettings || {}) }
            state.isLoading = false
            state.hasUnsavedChanges = false
          })
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to load settings'
            state.isLoading = false
          })
        }
      },

      // Save settings to backend
      saveSettings: async () => {
        set((state) => {
          state.isSaving = true
          state.error = null
        })

        try {
          // Check if knowlex API is available
          if (!window.knowlex) {
            console.warn('Knowlex API not available, cannot save settings')
            set((state) => {
              state.isSaving = false
              state.hasUnsavedChanges = false // Clear changes flag in dev mode
            })
            return
          }

          const { apiProviders, generalSettings, shortcutSettings, advancedSettings } = get()

          await Promise.all([
            window.knowlex.settings.update({ key: 'api-providers', value: apiProviders }),
            window.knowlex.settings.update({ key: 'general', value: generalSettings }),
            window.knowlex.settings.update({ key: 'shortcuts', value: shortcutSettings }),
            window.knowlex.settings.update({ key: 'advanced', value: advancedSettings })
          ])

          set((state) => {
            state.isSaving = false
            state.hasUnsavedChanges = false
          })
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to save settings'
            state.isSaving = false
          })
          throw error
        }
      },

      // Reset settings to defaults
      resetToDefaults: async (section) => {
        set((state) => {
          if (!section || section === 'general') {
            state.generalSettings = { ...defaultGeneralSettings }
          }
          if (!section || section === 'shortcuts') {
            state.shortcutSettings = { ...defaultShortcutSettings }
          }
          if (!section || section === 'advanced') {
            state.advancedSettings = { ...defaultAdvancedSettings }
          }
          if (!section || section === 'api') {
            state.apiProviders = []
          }
          state.hasUnsavedChanges = true
        })

        // Save immediately after reset
        await get().saveSettings()
      },

      // API Provider management
      addAPIProvider: (provider) => {
        set((state) => {
          const newProvider: APIProvider = {
            ...provider,
            id: `provider-${Date.now()}`,
            isDefault: state.apiProviders.length === 0 // First provider is default
          }

          // If this is set as default, unset others
          if (newProvider.isDefault) {
            state.apiProviders.forEach((p) => (p.isDefault = false))
          }

          state.apiProviders.push(newProvider)
          state.hasUnsavedChanges = true
        })
      },

      updateAPIProvider: (id, updates) => {
        set((state) => {
          const providerIndex = state.apiProviders.findIndex((p) => p.id === id)
          if (providerIndex !== -1) {
            // If setting as default, unset others
            if (updates.isDefault) {
              state.apiProviders.forEach((p) => (p.isDefault = false))
            }

            const existingProvider = state.apiProviders[providerIndex]
            if (existingProvider) {
              Object.assign(existingProvider, updates)
            }
            state.hasUnsavedChanges = true
          }
        })
      },

      removeAPIProvider: (id) => {
        set((state) => {
          const wasDefault = state.apiProviders.find((p) => p.id === id)?.isDefault
          state.apiProviders = state.apiProviders.filter((p) => p.id !== id)

          // If we removed the default, set the first remaining as default
          if (wasDefault && state.apiProviders.length > 0) {
            const firstProvider = state.apiProviders[0]
            if (firstProvider) {
              firstProvider.isDefault = true
            }
          }

          state.hasUnsavedChanges = true
        })
      },

      setDefaultProvider: (id) => {
        set((state) => {
          state.apiProviders.forEach((p) => {
            p.isDefault = p.id === id
          })
          state.hasUnsavedChanges = true
        })
      },

      testAPIProvider: async (id) => {
        set((state) => {
          state.isTesting = true
          state.testResults[id] = { success: false, message: 'Testing...' }
        })

        try {
          const provider = get().apiProviders.find((p) => p.id === id)
          if (!provider) {
            throw new Error('Provider not found')
          }

          const result = await window.knowlex.ai.testConnection(provider)

          set((state) => {
            state.testResults[id] = {
              success: result.success,
              message:
                result.error || (result.success ? 'Connection successful' : 'Connection failed')
            }
            state.isTesting = false
          })

          return result.success
        } catch (error) {
          set((state) => {
            state.testResults[id] = {
              success: false,
              message: error instanceof Error ? error.message : 'Test failed'
            }
            state.isTesting = false
          })
          return false
        }
      },

      // Settings updates
      updateGeneralSettings: (updates) => {
        set((state) => {
          Object.assign(state.generalSettings, updates)
          state.hasUnsavedChanges = true
        })
      },

      updateShortcutSettings: (updates) => {
        set((state) => {
          Object.assign(state.shortcutSettings, updates)
          state.hasUnsavedChanges = true
        })
      },

      updateAdvancedSettings: (updates) => {
        set((state) => {
          Object.assign(state.advancedSettings, updates)
          state.hasUnsavedChanges = true
        })
      },

      // Validation
      validateSettings: () => {
        const state = get()
        const errors: string[] = []

        // Validate API providers
        if (state.apiProviders.length === 0) {
          errors.push('At least one API provider is required')
        }

        const defaultProviders = state.apiProviders.filter((p) => p.isDefault)
        if (defaultProviders.length !== 1) {
          errors.push('Exactly one API provider must be set as default')
        }

        // Validate required fields
        state.apiProviders.forEach((provider) => {
          if (!provider.name.trim()) {
            errors.push(`API provider name is required`)
          }
          if (!provider.model.trim()) {
            errors.push(`Model is required for provider: ${provider.name}`)
          }
          if (provider.provider !== 'local' && !provider.apiKey?.trim()) {
            errors.push(`API key is required for provider: ${provider.name}`)
          }
        })

        // Validate file size limits
        if (state.generalSettings.maxFileSize < 1024) {
          // 1KB minimum
          errors.push('Maximum file size must be at least 1KB')
        }

        if (state.generalSettings.maxFilesPerUpload < 1) {
          errors.push('Maximum files per upload must be at least 1')
        }

        return {
          isValid: errors.length === 0,
          errors
        }
      },

      // Utilities
      markAsChanged: () => {
        set((state) => {
          state.hasUnsavedChanges = true
        })
      },

      clearChanges: () => {
        set((state) => {
          state.hasUnsavedChanges = false
        })
      },

      clearError: () => {
        set((state) => {
          state.error = null
        })
      },

      getDefaultProvider: () => {
        return get().apiProviders.find((p) => p.isDefault) || null
      }
    })),
    {
      name: 'knowlex-settings-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user preferences, not runtime state
        generalSettings: state.generalSettings,
        shortcutSettings: state.shortcutSettings
      })
    }
  )
)

// Convenience hooks
export const useAPIProviders = () =>
  useSettingsStore((state) => ({
    providers: state.apiProviders,
    defaultProvider: state.getDefaultProvider(),
    addProvider: state.addAPIProvider,
    updateProvider: state.updateAPIProvider,
    removeProvider: state.removeAPIProvider,
    setDefault: state.setDefaultProvider,
    testProvider: state.testAPIProvider,
    testResults: state.testResults,
    isTesting: state.isTesting
  }))

export const useGeneralSettings = () =>
  useSettingsStore((state) => ({
    settings: state.generalSettings,
    updateSettings: state.updateGeneralSettings
  }))

export const useShortcutSettings = () =>
  useSettingsStore((state) => ({
    shortcuts: state.shortcutSettings,
    updateShortcuts: state.updateShortcutSettings
  }))

export const useAdvancedSettings = () =>
  useSettingsStore((state) => ({
    settings: state.advancedSettings,
    updateSettings: state.updateAdvancedSettings
  }))

// Individual selectors to prevent re-render loops
export const useLoadSettings = () => useSettingsStore((state) => state.loadSettings)
export const useSaveSettings = () => useSettingsStore((state) => state.saveSettings)
export const useResetToDefaults = () => useSettingsStore((state) => state.resetToDefaults)
export const useValidateSettings = () => useSettingsStore((state) => state.validateSettings)
export const useHasUnsavedChanges = () => useSettingsStore((state) => state.hasUnsavedChanges)
export const useSettingsLoading = () => useSettingsStore((state) => state.isLoading)
export const useSettingsSaving = () => useSettingsStore((state) => state.isSaving)
export const useSettingsError = () => useSettingsStore((state) => state.error)
export const useClearSettingsError = () => useSettingsStore((state) => state.clearError)

export default useSettingsStore

/**
 * Store exports for Knowlex Desktop Application
 * Central export point for all Zustand stores
 */

// Store imports for internal use
import useAppStoreInternal from './app'
import useSettingsStoreInternal from './settings'
import useProjectStoreInternal from './project'
import useConversationStoreInternal from './conversation'

// Store exports
export {
  default as useAppStore,
  useTheme,
  useLanguage,
  useSidebar,
  useAppStatus,
  initializeThemeSync,
  cleanupThemeSync
} from './app'
export { default as useProjectStore, useCurrentProject, useProjects } from './project'
export {
  default as useConversationStore,
  useCurrentConversation,
  useConversations,
  useConversationsLoading,
  useConversationsError,
  useSendMessage,
  useRegenerateMessage,
  useEditMessage,
  useDeleteMessage,
  useForkConversation,
  useIsSending,
  useIsStreaming,
  useStreamingMessageId,
  useOnStreamingUpdate,
  useSetStreamingState
} from './conversation'
export {
  default as useSettingsStore,
  useAPIProviders,
  useGeneralSettings,
  useShortcutSettings,
  useAdvancedSettings,
  useLoadSettings,
  useSaveSettings,
  useResetToDefaults,
  useValidateSettings,
  useHasUnsavedChanges,
  useSettingsLoading,
  useSettingsSaving,
  useSettingsError,
  useClearSettingsError
} from './settings'

// Type exports
export type { Theme, Language, AppState } from './app'
export type { ProjectState } from './project'
export type { ConversationState, SendMessageData } from './conversation'
export type {
  SettingsState,
  APIProvider,
  GeneralSettings,
  ShortcutSettings,
  AdvancedSettings
} from './settings'

// Flag to prevent duplicate store initialization in React.StrictMode
let storesInitialized = false

// Store initialization and cleanup utilities
export const initializeStores = async () => {
  console.log('Starting store initialization...')

  // Prevent duplicate initialization in React.StrictMode
  if (storesInitialized) {
    console.log('Stores already initialized, skipping...')
    return
  }
  storesInitialized = true

  // Check if Knowlex API is available
  console.log('Checking Knowlex API availability...')
  console.log('window.knowlex:', typeof window.knowlex)
  console.log('window.electron:', typeof window.electron)

  // Initialize stores that need async setup
  const settingsStore = useSettingsStoreInternal.getState()
  const conversationStore = useConversationStoreInternal.getState()
  const projectStore = useProjectStoreInternal.getState()
  const appStore = useAppStoreInternal.getState()

  try {
    console.log('Initializing theme sync...')
    // Initialize theme synchronization first
    const { initializeThemeSync } = await import('./app')
    initializeThemeSync()

    console.log('Loading settings...')
    // Load settings
    await settingsStore.loadSettings()

    console.log('Initializing data stores...')
    // Initialize data stores
    await Promise.all([conversationStore.initialize(), projectStore.initialize()])

    console.log('Marking app as initialized...')
    // Mark app as initialized
    appStore.setInitialized(true)

    console.log('Stores initialized successfully')
  } catch (error) {
    console.error('Failed to initialize stores:', error)

    // Still mark as initialized to prevent infinite loading
    // The stores will handle their own error states
    appStore.setInitialized(true)

    // Don't re-throw the error to allow the app to continue
    console.warn('App initialized with store loading failures')
  }
}

export const resetAllStores = () => {
  useAppStoreInternal.getState().reset()
  useProjectStoreInternal.getState().reset()
  useConversationStoreInternal.getState().reset()
  // Note: Don't reset settings store as it contains user preferences
}

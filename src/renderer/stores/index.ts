/**
 * Store exports for Knowlex Desktop Application
 * Central export point for all Zustand stores
 */

// Store imports for internal use
import useAppStoreInternal from './app'
import useSettingsStoreInternal from './settings'
import useProjectStoreInternal from './project'

// Store exports
export {
  default as useAppStore,
  useTheme,
  useLanguage,
  useAppStatus,
  initializeThemeSync,
  cleanupThemeSync
} from './app'
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
  useIsSending,
  useIsStreaming,
  useStreamingMessageId,
  useOnStreamingUpdate,
  useSetStreamingState
} from './conversation'
export { default as useSettingsStore, useDefaultModel } from './settings'

// Type exports
export type { Theme, AppState } from './app'
export type { Language } from '@shared/i18n/types'
import useConversationStoreInternal from './conversation'
export type ConversationState = ReturnType<typeof useConversationStoreInternal.getState>
// Settings types are trimmed; no public re-exports needed

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

    console.log('Initializing i18n...')
    // Initialize i18n with current language setting
    const { initializeI18n } = await import('@shared/i18n')
    await initializeI18n(appStore.language)

    console.log('Initializing data stores...')
    // Initialize data stores
    await conversationStore.initialize()
    await projectStore.fetchProjects()

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
  useConversationStoreInternal.getState().reset()
  // Note: Don't reset settings store as it contains user preferences
}

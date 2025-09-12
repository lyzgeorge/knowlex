import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type GeneralSettings = {
  defaultModelId?: string
}

type SettingsState = {
  generalSettings: GeneralSettings
  isLoading: boolean
  error: string | null
  loadSettings: () => Promise<void>
  setDefaultModelId: (modelId: string | null) => void
}

const initialGeneralSettings: GeneralSettings = {}

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      generalSettings: initialGeneralSettings,
      isLoading: false,
      error: null,
      loadSettings: async () => {
        // No-op for now; backend settings are env-driven.
        set((s) => {
          s.isLoading = false
          s.error = null
        })
      },
      setDefaultModelId: (modelId) => {
        set((s) => {
          if (modelId) s.generalSettings.defaultModelId = modelId
          else delete s.generalSettings.defaultModelId
        })
      }
    })),
    {
      name: 'knowlex-settings-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ generalSettings: state.generalSettings })
    }
  )
)

export const useUserDefaultModelPreference = () => {
  const defaultModelId = useSettingsStore((state) => state.generalSettings.defaultModelId)
  const setDefaultModelId = useSettingsStore((state) => state.setDefaultModelId)
  return { defaultModelId, setDefaultModelId }
}

export default useSettingsStore

// Sync default model changes from main process via unified change event
if (typeof window !== 'undefined' && window.knowlex?.onModelConfigChanged) {
  window.knowlex.onModelConfigChanged(
    (payload: { events: Array<{ type: string; id?: string }> }) => {
      for (const evt of payload.events || []) {
        if (evt.type === 'default-changed' && evt.id) {
          useSettingsStore.setState((state) => {
            state.generalSettings.defaultModelId = evt.id as string
          })
        }
      }
    }
  )
}

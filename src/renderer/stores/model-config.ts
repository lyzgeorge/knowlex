import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type {
  ModelConfigPublic,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  ModelConnectionTestResult
} from '@shared/types/models'
import { clearModelCapabilitiesCache } from '@shared/utils/model-resolution'

// Enable Map/Set support in Immer for Map-based caches used by this store
enableMapSet()

interface ModelConfigState {
  models: ModelConfigPublic[]
  loading: boolean
  testing: Record<string, boolean>
  initialized: boolean
  error: string | null

  // Performance optimizations
  modelsById: Map<string, ModelConfigPublic>
  defaultModelId: string | null
  defaultModelCache: ModelConfigPublic | null
  lastDefaultUpdate: number

  // Actions
  fetchModels: () => Promise<void>
  createModel: (input: CreateModelConfigInput) => Promise<ModelConfigPublic>
  updateModel: (id: string, updates: UpdateModelConfigInput) => Promise<ModelConfigPublic>
  deleteModel: (id: string) => Promise<void>
  testModel: (id: string) => Promise<ModelConnectionTestResult>
  getModelById: (id: string) => ModelConfigPublic | undefined
  getDefaultModel: () => ModelConfigPublic | undefined

  // Performance helpers
  rebuildIndexes: () => void
  invalidateDefaultCache: () => void
}

const initial: Pick<
  ModelConfigState,
  | 'models'
  | 'loading'
  | 'testing'
  | 'initialized'
  | 'error'
  | 'modelsById'
  | 'defaultModelId'
  | 'defaultModelCache'
  | 'lastDefaultUpdate'
> = {
  models: [],
  loading: false,
  testing: {},
  initialized: false,
  error: null,
  modelsById: new Map<string, ModelConfigPublic>(),
  defaultModelId: null,
  defaultModelCache: null,
  lastDefaultUpdate: 0
}

export const useModelConfigStore = create<ModelConfigState>()(
  immer((set, get) => ({
    ...initial,

    rebuildIndexes: () => {
      set((s) => {
        // Rebuild modelsById Map
        s.modelsById = new Map(s.models.map((model) => [model.id, model]))

        // Invalidate default cache to force recalculation
        s.defaultModelCache = null
        s.lastDefaultUpdate = 0
      })
    },

    invalidateDefaultCache: () => {
      set((s) => {
        s.defaultModelCache = null
        s.lastDefaultUpdate = 0
      })
    },

    fetchModels: async () => {
      if (get().loading) return

      set((s) => {
        s.loading = true
        s.error = null
      })

      try {
        const res = await window.knowlex.modelConfig.list()
        if (!res?.success) throw new Error(res?.error || 'Failed to load model configurations')

        const publicModels = (res.data as ModelConfigPublic[]) || []
        set((s) => {
          s.models = publicModels
          s.loading = false
          s.initialized = true
          // Rebuild performance indexes
          s.modelsById = new Map(publicModels.map((model) => [model.id, model]))
          // Invalidate cached default
          s.defaultModelCache = null
          s.lastDefaultUpdate = 0
        })
      } catch (e) {
        set((s) => {
          s.error = e instanceof Error ? e.message : 'Failed to load model configurations'
          s.loading = false
        })
      }
    },

    createModel: async (input: CreateModelConfigInput) => {
      const res = await window.knowlex.modelConfig.create(input)
      if (!res?.success || !res.data) {
        throw new Error(res?.error || 'Failed to create model configuration')
      }

      const publicModel = res.data as ModelConfigPublic
      set((s) => {
        s.models.push(publicModel)
        s.modelsById.set(publicModel.id, publicModel)
        // Invalidate default cache as this might be the new default
        s.defaultModelCache = null
        s.lastDefaultUpdate = 0
      })

      // Capabilities for this model may have changed
      clearModelCapabilitiesCache(publicModel.id)

      return publicModel as any
    },

    updateModel: async (id: string, updates: UpdateModelConfigInput) => {
      const res = await window.knowlex.modelConfig.update(id, updates)
      if (!res?.success || !res.data) {
        throw new Error(res?.error || 'Failed to update model configuration')
      }

      const publicUpdated = res.data as ModelConfigPublic
      set((s) => {
        const idx = s.models.findIndex((m) => m.id === id)
        if (idx >= 0) {
          s.models[idx] = publicUpdated
          // Update Map cache
          s.modelsById.set(id, publicUpdated)
          // Invalidate default cache if this was the default model
          if (s.defaultModelId === id) {
            s.defaultModelCache = null
            s.lastDefaultUpdate = 0
          }
        }
      })

      clearModelCapabilitiesCache(id)

      return publicUpdated as any
    },

    deleteModel: async (id: string) => {
      const res = await window.knowlex.modelConfig.delete(id)
      if (!res?.success) {
        throw new Error(res?.error || 'Failed to delete model configuration')
      }

      set((s) => {
        s.models = s.models.filter((m) => m.id !== id)
        // Update Map cache
        s.modelsById.delete(id)
        // Invalidate default cache if this was the default model
        if (s.defaultModelId === id) {
          s.defaultModelCache = null
          s.lastDefaultUpdate = 0
        }
      })

      clearModelCapabilitiesCache(id)
    },

    testModel: async (id: string) => {
      set((s) => {
        s.testing[id] = true
      })

      try {
        const res = await window.knowlex.modelConfig.test(id)
        if (!res?.success || !res.data) {
          throw new Error(res?.error || 'Connection test failed')
        }

        return res.data as ModelConnectionTestResult
      } finally {
        set((s) => {
          delete s.testing[id]
        })
      }
    },

    getModelById: (id: string) => {
      const state = get()
      // Use Map cache for O(1) lookup
      return state.modelsById.get(id) || state.models.find((m) => m.id === id)
    },

    getDefaultModel: () => {
      const state = get()
      const now = Date.now()

      // Use cached default if still valid (5 minute TTL)
      if (state.defaultModelCache && now - state.lastDefaultUpdate < 300000) {
        return state.defaultModelCache
      }

      // Recalculate default model
      if (state.models.length === 0) return undefined

      // First model by creation time (oldest first)
      const defaultModel = [...state.models].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0]

      // Cache the result
      set((s) => {
        s.defaultModelCache = defaultModel || null
        s.lastDefaultUpdate = now
      })

      return defaultModel
    }
  }))
)

// Event listeners for real-time synchronization
if (typeof window !== 'undefined' && window.knowlex) {
  // Unified, debounced, typed change events (batched)
  window.knowlex.onModelConfigChanged?.(
    (payload: {
      version: number
      changedAt: string
      events: Array<{ type: string; model?: ModelConfigPublic; id?: string }>
    }) => {
      const events = payload?.events || []
      if (events.length === 0) return

      useModelConfigStore.setState((s) => {
        for (const evt of events) {
          switch (evt.type) {
            case 'created':
              if (evt.model && !s.modelsById.get(evt.model.id)) {
                s.models.push(evt.model)
                s.modelsById.set(evt.model.id, evt.model)
              } else if (evt.model) {
                // Replace existing
                const idx = s.models.findIndex((m) => m.id === evt.model!.id)
                if (idx >= 0) s.models[idx] = evt.model
                s.modelsById.set(evt.model.id, evt.model)
              }
              if (evt.model) clearModelCapabilitiesCache(evt.model.id)
              break
            case 'updated':
              if (evt.model) {
                const idx = s.models.findIndex((m) => m.id === evt.model!.id)
                if (idx >= 0) s.models[idx] = evt.model
                s.modelsById.set(evt.model.id, evt.model)
                clearModelCapabilitiesCache(evt.model.id)
              }
              break
            case 'deleted':
              if (evt.id) {
                s.models = s.models.filter((m) => m.id !== evt.id)
                s.modelsById.delete(evt.id)
                if (s.defaultModelId === evt.id) {
                  s.defaultModelCache = null
                  s.lastDefaultUpdate = 0
                }
                clearModelCapabilitiesCache(evt.id)
              }
              break
            case 'default-changed':
              // Settings store will also sync, but we also invalidate default cache
              s.defaultModelCache = null
              s.lastDefaultUpdate = 0
              break
            default:
              break
          }
        }
      })
    }
  )
}

export default useModelConfigStore

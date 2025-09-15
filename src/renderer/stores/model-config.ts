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
import { runAsync, runApiCall, createLoadingSetter } from '@renderer/utils/store-helpers'

// Enable Map/Set support in Immer for Map-based caches used by this store
enableMapSet()

// Specific loading setters for this store
const modelLoadingSetters = {
  isLoading: createLoadingSetter('loading'),
  isTesting: (id: string, testing: boolean) => (draft: any) => {
    if (testing) {
      draft.testing[id] = true
    } else {
      delete draft.testing[id]
    }
  }
}

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
  updateDefaultModelCache: () => void

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

const _getOldestModel = (models: ModelConfigPublic[]) => {
  if (models.length === 0) return undefined
  return [...models].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0]
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

      await runAsync(
        set,
        async () => {
          const res = await window.knowlex.modelConfig.list()
          if (!res?.success) throw new Error(res?.error || 'Failed to load model configurations')

          const publicModels = (res.data as ModelConfigPublic[]) || []
          set((s) => {
            s.models = publicModels
            s.initialized = true
            // Rebuild performance indexes
            s.modelsById = new Map(publicModels.map((model) => [model.id, model]))
            // Invalidate cached default
            s.defaultModelCache = null
            s.lastDefaultUpdate = 0
          })
        },
        {
          setLoading: modelLoadingSetters.isLoading,
          autoUnwrap: true,
          action: 'load model configurations'
        }
      )
    },

    createModel: async (input: CreateModelConfigInput) => {
      return runAsync(
        set,
        async () => {
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
          clearModelCapabilitiesCache(publicModel.id)
          return publicModel
        },
        {
          setLoading: modelLoadingSetters.isLoading,
          autoUnwrap: true,
          action: 'create model configuration'
        }
      )
    },

    updateModel: async (id: string, updates: UpdateModelConfigInput) => {
      return runAsync(
        set,
        async () => {
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
          return publicUpdated
        },
        {
          setLoading: modelLoadingSetters.isLoading,
          autoUnwrap: true,
          action: 'update model configuration'
        }
      )
    },

    deleteModel: async (id: string) => {
      await runApiCall(
        set,
        () => window.knowlex.modelConfig.delete(id),
        'Failed to delete model configuration',
        () => {
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
        { autoUnwrap: true, action: 'delete model configuration' }
      )
    },

    testModel: async (id: string) => {
      return runAsync(
        set,
        async () => {
          const res = await window.knowlex.modelConfig.test(id)
          if (!res?.success || !res.data) {
            throw new Error(res?.error || 'Connection test failed')
          }
          return res.data as ModelConnectionTestResult
        },
        {
          setLoading: (loading) => modelLoadingSetters.isTesting(id, loading),
          autoUnwrap: true,
          action: 'test model connection'
        }
      )
    },

    getModelById: (id: string) => {
      const state = get()
      // Use Map cache for O(1) lookup
      return state.modelsById.get(id) || state.models.find((m) => m.id === id)
    },

    getDefaultModel: () => {
      const state = get()

      // Use cached default if still valid (5 minute TTL)
      if (state.defaultModelCache && Date.now() - state.lastDefaultUpdate < 300000) {
        return state.defaultModelCache
      }

      // Recalculate default model without caching during render
      return _getOldestModel(state.models)
    },
    updateDefaultModelCache: () => {
      const state = get()
      const now = Date.now()

      const defaultModel = _getOldestModel(state.models)

      set((s) => {
        s.defaultModelCache = defaultModel || null
        s.lastDefaultUpdate = now
      })
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

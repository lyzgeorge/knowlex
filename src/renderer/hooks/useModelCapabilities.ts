/**
 * Centralized model capabilities hook
 *
 * Provides unified capability detection and caching for model configurations
 * across all components that need to check model features.
 */

import { useMemo } from 'react'
import { useModelConfigStore } from '@renderer/stores/model-config'
import { useUserDefaultModelPreference } from '@renderer/stores/settings'
import { getModelCapabilities, type ModelCapabilities } from '@shared/utils/model-resolution'

export interface ModelCapabilitiesResult {
  /** Model capabilities for the given ID */
  capabilities: ModelCapabilities
  /** Whether the model was found */
  modelFound: boolean
  /** The resolved model configuration */
  modelConfig: any | null
}

/**
 * Hook to get capabilities for a specific model ID
 */
export function useModelCapabilities(modelId: string | null | undefined): ModelCapabilitiesResult {
  const modelsById = useModelConfigStore((s) => s.modelsById)

  return useMemo(() => {
    if (!modelId) {
      return {
        capabilities: getModelCapabilities(null),
        modelFound: false,
        modelConfig: null
      }
    }

    const modelConfig = modelsById.get(modelId) || null
    return {
      capabilities: getModelCapabilities(modelConfig),
      modelFound: !!modelConfig,
      modelConfig
    }
  }, [modelId, modelsById])
}

/**
 * Hook to get capabilities for the currently active model
 * Uses centralized model resolution logic
 */
export function useActiveModelCapabilities(
  conversationModelId?: string | null,
  explicitModelId?: string | null
): ModelCapabilitiesResult {
  const getDefaultModel = useModelConfigStore((s) => s.getDefaultModel)
  // Read user-selected default from settings (single source of truth)
  const { defaultModelId: userDefaultModelId } = useUserDefaultModelPreference()

  // Determine which model ID to use based on priority:
  // 1. Explicit model ID (passed directly)
  // 2. Conversation's model ID
  // 3. User's chosen default model from settings
  // 4. System default from model-config store (first available model)
  const defaultModel = getDefaultModel()
  const activeModelId =
    explicitModelId || conversationModelId || userDefaultModelId || defaultModel?.id

  return useModelCapabilities(activeModelId)
}

/**
 * Hook to get capabilities for multiple models at once
 * Useful for comparison or bulk operations
 */
export function useMultipleModelCapabilities(
  modelIds: Array<string | null | undefined>
): ModelCapabilitiesResult[] {
  const modelsById = useModelConfigStore((s) => s.modelsById)

  return useMemo(() => {
    return modelIds.map((modelId) => {
      if (!modelId) {
        return {
          capabilities: getModelCapabilities(null),
          modelFound: false,
          modelConfig: null
        }
      }

      const modelConfig = modelsById.get(modelId) || null
      return {
        capabilities: getModelCapabilities(modelConfig),
        modelFound: !!modelConfig,
        modelConfig
      }
    })
  }, [modelIds, modelsById])
}

/**
 * Hook to filter models by specific capabilities
 */
export function useModelsByCapability(
  requiredCapabilities: Partial<ModelCapabilities>,
  matchAll = true
): Array<{ modelConfig: any; capabilities: ModelCapabilities }> {
  const models = useModelConfigStore((s) => s.models)

  return useMemo(() => {
    return models
      .map((model) => ({
        modelConfig: model,
        capabilities: getModelCapabilities(model)
      }))
      .filter(({ capabilities }) => {
        const entries = Object.entries(requiredCapabilities)

        if (matchAll) {
          // All required capabilities must match
          return entries.every(
            ([key, value]) => capabilities[key as keyof ModelCapabilities] === value
          )
        } else {
          // At least one required capability must match
          return entries.some(
            ([key, value]) => capabilities[key as keyof ModelCapabilities] === value
          )
        }
      })
  }, [models, requiredCapabilities, matchAll])
}

/**
 * Hook to get models that support reasoning
 */
export function useReasoningCapableModels() {
  return useModelsByCapability({ supportsReasoning: true })
}

/**
 * Hook to get models that support vision
 */
export function useVisionCapableModels() {
  return useModelsByCapability({ supportsVision: true })
}

/**
 * Hook to check if any models support a specific capability
 */
export function useHasCapabilitySupport(capability: keyof ModelCapabilities): boolean {
  const models = useModelConfigStore((s) => s.models)

  return useMemo(() => {
    return models.some((model) => {
      const capabilities = getModelCapabilities(model)
      return capabilities[capability]
    })
  }, [models, capability])
}

/**
 * Convenience hook to get common capability checks
 */
export function useCapabilityStatus() {
  const hasReasoning = useHasCapabilitySupport('supportsReasoning')
  const hasVision = useHasCapabilitySupport('supportsVision')
  const hasTools = useHasCapabilitySupport('supportsToolUse')
  const hasWebSearch = useHasCapabilitySupport('supportsWebSearch')

  return {
    hasReasoning,
    hasVision,
    hasTools,
    hasWebSearch,
    hasAnyAdvanced: hasReasoning || hasVision || hasTools || hasWebSearch
  }
}

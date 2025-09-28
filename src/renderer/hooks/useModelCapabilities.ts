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

interface ModelCapabilitiesResult {
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
function useModelCapabilities(modelId: string | null | undefined): ModelCapabilitiesResult {
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

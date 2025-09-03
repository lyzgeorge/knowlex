/**
 * Centralized Model Resolution Service
 *
 * Provides unified model resolution logic following 3-tier priority:
 * 1. Message explicit modelConfigId
 * 2. Conversation modelConfigId
 * 3. User default settings.defaultModelId
 * 4. System fallback (earliest created model)
 */

import type { ModelConfig, ModelConfigPublic } from '@shared/types/models'

export interface ModelResolutionContext {
  /** Explicit model ID from message or operation */
  explicitModelId?: string | null
  /** Model ID associated with conversation */
  conversationModelId?: string | null
  /** User's default model preference */
  userDefaultModelId?: string | null
  /** Available models for resolution */
  availableModels: ModelConfig[]
}

export interface ModelResolutionResult {
  /** Resolved model configuration */
  modelConfig: ModelConfig | null
  /** Model capabilities */
  capabilities: ModelCapabilities
  /** Source of resolution */
  source: 'message' | 'conversation' | 'user-default' | 'system-default' | 'fallback'
  /** Resolution trace for debugging */
  trace: string[]
  /** Any warnings during resolution */
  warnings: string[]
}

export interface ModelCapabilities {
  supportsReasoning: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsWebSearch: boolean
}

// Cache for model capabilities to avoid repeated lookups
const capabilitiesCache = new Map<string, { capabilities: ModelCapabilities; timestamp: number }>()
const CACHE_TTL = 60000 // 1 minute

/**
 * Resolves model context following unified 3-tier priority strategy
 */
export function resolveModelContext(context: ModelResolutionContext): ModelResolutionResult {
  const trace: string[] = []
  const warnings: string[] = []
  let modelConfig: ModelConfig | null = null
  let source: ModelResolutionResult['source'] = 'fallback'

  // Helper to find model by ID
  const findModelById = (id: string | null | undefined): ModelConfig | null => {
    if (!id) return null
    return context.availableModels.find((m) => m.id === id) || null
  }

  // Helper to get system default (earliest created model)
  const getSystemDefault = (): ModelConfig | null => {
    if (context.availableModels.length === 0) return null
    return (
      context.availableModels
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] ||
      null
    )
  }

  // 1. Try explicit model ID (highest priority)
  if (context.explicitModelId) {
    trace.push(`Checking explicit model ID: ${context.explicitModelId}`)
    modelConfig = findModelById(context.explicitModelId)
    if (modelConfig) {
      source = 'message'
      trace.push(`✓ Resolved from explicit model ID`)
    } else {
      warnings.push(`Explicit model ID "${context.explicitModelId}" not found`)
    }
  }

  // 2. Try conversation model ID
  if (!modelConfig && context.conversationModelId) {
    trace.push(`Checking conversation model ID: ${context.conversationModelId}`)
    modelConfig = findModelById(context.conversationModelId)
    if (modelConfig) {
      source = 'conversation'
      trace.push(`✓ Resolved from conversation model ID`)
    } else {
      warnings.push(`Conversation model ID "${context.conversationModelId}" not found`)
    }
  }

  // 3. Try user default model ID
  if (!modelConfig && context.userDefaultModelId) {
    trace.push(`Checking user default model ID: ${context.userDefaultModelId}`)
    modelConfig = findModelById(context.userDefaultModelId)
    if (modelConfig) {
      source = 'user-default'
      trace.push(`✓ Resolved from user default model ID`)
    } else {
      warnings.push(`User default model ID "${context.userDefaultModelId}" not found`)
    }
  }

  // 4. Fallback to system default (earliest created)
  if (!modelConfig) {
    trace.push(`Falling back to system default (earliest created)`)
    modelConfig = getSystemDefault()
    if (modelConfig) {
      source = 'system-default'
      trace.push(`✓ Resolved from system default: ${modelConfig.id}`)
    } else {
      trace.push(`⚠ No models available`)
      warnings.push('No models available for resolution')
    }
  }

  // Extract capabilities
  const capabilities = getModelCapabilities(modelConfig)

  return {
    modelConfig,
    capabilities,
    source,
    trace,
    warnings
  }
}

/**
 * Gets model capabilities with caching for performance
 */
export function getModelCapabilities(
  modelConfig: ModelConfig | ModelConfigPublic | null
): ModelCapabilities {
  const defaultCapabilities: ModelCapabilities = {
    supportsReasoning: false,
    supportsVision: false,
    supportsToolUse: false,
    supportsWebSearch: false
  }

  if (!modelConfig) {
    return defaultCapabilities
  }

  // Check cache first
  const cached = capabilitiesCache.get(modelConfig.id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.capabilities
  }

  // Compute capabilities
  const capabilities: ModelCapabilities = {
    supportsReasoning: modelConfig.supportsReasoning,
    supportsVision: modelConfig.supportsVision,
    supportsToolUse: modelConfig.supportsToolUse,
    supportsWebSearch: modelConfig.supportsWebSearch
  }

  // Cache result
  capabilitiesCache.set(modelConfig.id, {
    capabilities,
    timestamp: Date.now()
  })

  return capabilities
}

/**
 * Clears capabilities cache (call when models are updated)
 */
export function clearModelCapabilitiesCache(modelId?: string): void {
  if (modelId) {
    capabilitiesCache.delete(modelId)
  } else {
    capabilitiesCache.clear()
  }
}

/**
 * Gets active model ID from various sources following priority
 */
export function getActiveModelId(
  context: Omit<ModelResolutionContext, 'availableModels'>
): string | null {
  if (context.explicitModelId) return context.explicitModelId
  if (context.conversationModelId) return context.conversationModelId
  if (context.userDefaultModelId) return context.userDefaultModelId
  return null
}

/**
 * Validates model resolution and returns detailed result
 */
export function validateModelResolution(context: ModelResolutionContext): {
  isValid: boolean
  errors: string[]
  result: ModelResolutionResult
} {
  const result = resolveModelContext(context)
  const errors: string[] = []

  if (!result.modelConfig) {
    errors.push('No valid model could be resolved')
  }

  if (result.warnings.length > 0) {
    errors.push(...result.warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    result
  }
}

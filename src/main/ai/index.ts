/**
 * AI Module Index
 * Exports all AI-related functionality for easy importing
 */

// Base classes and types
export {
  BaseAIModel,
  type AIProvider,
  AIConfigurationError,
  AIValidationError,
  AIAPIError,
  AIUtils
} from './base'

// Manager functionality
export {
  default as aiModelManager,
  registerModel,
  getModel,
  getModelFromConfig,
  listModels,
  listProviders,
  validateConfig,
  getDefaultConfig,
  clearModelCache,
  cleanupModelCache,
  getModelCacheStats,
  startCacheCleanup,
  stopCacheCleanup
} from './manager'

// Re-export types for convenience
export type {
  AIModel,
  AIMessage,
  AIMessageContent,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig,
  ToolCall,
  TokenUsage
} from '../../shared/types/ai'

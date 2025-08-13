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

// Provider implementations
export { OpenAIModel, OpenAIProvider } from './openai'
export { ClaudeModel, ClaudeProvider } from './claude'

// Re-export types for convenience
export type {
  AIModel,
  AIMessage,
  AIMessageContent,
  AIResponse,
  AIStreamChunk,
  ModelCapabilities,
  AIConfig,
  OpenAIConfig,
  ClaudeConfig,
  ToolCall,
  TokenUsage
} from '../../shared/types/ai'

// Auto-register providers
import { registerModel } from './manager'
import { OpenAIProvider } from './openai'
import { ClaudeProvider } from './claude'

/**
 * Initialize AI providers
 * Automatically registers OpenAI and Claude providers with the AI manager
 * This ensures they are available when the AI module is imported
 */
export const initializeAIProviders = (): void => {
  console.log('🤖 Initializing AI providers...')

  let successCount = 0
  let totalCount = 0

  try {
    totalCount++
    registerModel(OpenAIProvider)
    successCount++
    console.log('✅ OpenAI provider registered successfully')
  } catch (error) {
    console.error('❌ Failed to register OpenAI provider:', error)
  }

  try {
    totalCount++
    registerModel(ClaudeProvider)
    successCount++
    console.log('✅ Claude provider registered successfully')
  } catch (error) {
    console.error('❌ Failed to register Claude provider:', error)
  }

  console.log(`🎯 AI System ready: ${successCount}/${totalCount} providers loaded`)
}

// Auto-initialize providers when module is imported
initializeAIProviders()

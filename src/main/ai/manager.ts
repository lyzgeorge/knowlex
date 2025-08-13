import type { AIModel, AIConfig, ModelCapabilities } from '../../shared/types/ai'
import type { ModelConfig } from '../../shared/types/conversation'
import { AIProvider, AIConfigurationError, AIValidationError } from './base'
import { AI_MODELS, DEFAULT_AI_CONFIG } from '../../shared/constants/ai'

/**
 * AI Model Manager
 * Central registry and factory for AI model instances
 * Handles provider registration, model creation, and configuration management
 */

/**
 * Registry entry for AI model providers
 */
interface ProviderRegistry {
  [providerName: string]: AIProvider
}

/**
 * Cache entry for AI model instances
 */
interface ModelCacheEntry {
  model: AIModel
  config: AIConfig
  createdAt: number
  lastUsed: number
}

/**
 * Model cache with expiration and usage tracking
 */
interface ModelCache {
  [cacheKey: string]: ModelCacheEntry
}

/**
 * AI Model Manager Class
 * Singleton pattern for global model management
 */
class AIModelManager {
  private providers: ProviderRegistry = {}
  private modelCache: ModelCache = {}
  private readonly CACHE_TTL = 30 * 60 * 1000 // 30 minutes
  private readonly MAX_CACHE_SIZE = 10

  /**
   * Registers an AI provider with the manager
   * Validates provider interface before registration
   */
  registerProvider(provider: AIProvider): void {
    if (!provider.name || provider.name.trim().length === 0) {
      throw new AIConfigurationError('Provider name is required')
    }

    if (!provider.displayName || provider.displayName.trim().length === 0) {
      throw new AIConfigurationError('Provider display name is required')
    }

    if (typeof provider.createModel !== 'function') {
      throw new AIConfigurationError('Provider must implement createModel method')
    }

    if (typeof provider.validateConfig !== 'function') {
      throw new AIConfigurationError('Provider must implement validateConfig method')
    }

    if (typeof provider.getDefaultConfig !== 'function') {
      throw new AIConfigurationError('Provider must implement getDefaultConfig method')
    }

    if (typeof provider.getSupportedModels !== 'function') {
      throw new AIConfigurationError('Provider must implement getSupportedModels method')
    }

    const providerKey = provider.name.toLowerCase()

    if (this.providers[providerKey]) {
      console.warn(`Provider ${provider.name} is already registered, overwriting...`)
    }

    this.providers[providerKey] = provider
    console.log(`🔌 AI Provider registered: ${provider.name} (${provider.displayName})`)
    console.log(`   Supported models: ${provider.getSupportedModels().join(', ')}`)
  }

  /**
   * Unregisters an AI provider and clears related cache entries
   */
  unregisterProvider(providerName: string): void {
    const providerKey = providerName.toLowerCase()

    if (!this.providers[providerKey]) {
      throw new AIConfigurationError(`Provider ${providerName} is not registered`)
    }

    // Clear cache entries for this provider
    this.clearProviderCache(providerKey)

    delete this.providers[providerKey]
    console.log(`AI Provider unregistered: ${providerName}`)
  }

  /**
   * Gets an AI model instance by provider and configuration
   * Uses caching to avoid recreating models unnecessarily
   */
  async getModel(config: AIConfig): Promise<AIModel> {
    if (!config.model) {
      throw new AIValidationError('Model name is required in configuration')
    }

    // Determine provider from model name or explicit provider setting
    const provider = this.determineProvider(config)
    if (!provider) {
      throw new AIConfigurationError(`No provider found for model: ${config.model}`)
    }

    // Validate configuration with provider
    if (!provider.validateConfig(config)) {
      throw new AIValidationError(`Invalid configuration for provider: ${provider.name}`)
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(provider.name, config)
    const cachedEntry = this.getCachedModel(cacheKey)

    if (cachedEntry) {
      cachedEntry.lastUsed = Date.now()
      return cachedEntry.model
    }

    try {
      // Create new model instance
      const model = await provider.createModel(config)

      // Cache the model
      this.cacheModel(cacheKey, model, config)

      console.log(`✅ AI Model loaded successfully: ${provider.name}/${config.model}`)
      console.log(`   Provider: ${provider.displayName}`)
      console.log(`   Model: ${config.model}`)
      console.log(`   Base URL: ${config.baseURL || 'default'}`)
      console.log(`   Max Tokens: ${config.maxTokens || 'default'}`)
      console.log(`   Temperature: ${config.temperature || 'default'}`)
      return model
    } catch (error) {
      throw new AIConfigurationError(
        `Failed to create model ${config.model}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Gets a model using ModelConfig from conversation settings
   * Converts ModelConfig to AIConfig format
   */
  async getModelFromConfig(modelConfig: ModelConfig): Promise<AIModel> {
    const aiConfig: AIConfig = {
      ...DEFAULT_AI_CONFIG,
      apiKey: modelConfig.apiKey || '',
      model: modelConfig.model,
      ...(modelConfig.baseURL && { baseURL: modelConfig.baseURL }),
      ...(modelConfig.maxTokens && { maxTokens: modelConfig.maxTokens })
    }

    return this.getModel(aiConfig)
  }

  /**
   * Lists all registered providers
   */
  listProviders(): Array<{ name: string; displayName: string; models: string[] }> {
    return Object.values(this.providers).map((provider) => ({
      name: provider.name,
      displayName: provider.displayName,
      models: provider.getSupportedModels()
    }))
  }

  /**
   * Lists all available models across all providers
   */
  listAllModels(): Array<{ provider: string; model: string; capabilities: ModelCapabilities }> {
    const models: Array<{ provider: string; model: string; capabilities: ModelCapabilities }> = []

    for (const provider of Object.values(this.providers)) {
      const supportedModels = provider.getSupportedModels()

      for (const modelName of supportedModels) {
        // Get capabilities from constants if available
        const capabilities = this.getModelCapabilities(provider.name, modelName)

        models.push({
          provider: provider.name,
          model: modelName,
          capabilities
        })
      }
    }

    return models
  }

  /**
   * Gets default configuration for a provider
   */
  getProviderDefaultConfig(providerName: string): Partial<AIConfig> {
    const provider = this.providers[providerName.toLowerCase()]
    if (!provider) {
      throw new AIConfigurationError(`Provider ${providerName} is not registered`)
    }

    return {
      ...DEFAULT_AI_CONFIG,
      ...provider.getDefaultConfig()
    }
  }

  /**
   * Validates a configuration against its provider
   */
  validateConfiguration(config: AIConfig): boolean {
    try {
      const provider = this.determineProvider(config)
      return provider ? provider.validateConfig(config) : false
    } catch {
      return false
    }
  }

  /**
   * Clears expired entries from the model cache
   */
  cleanupCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of Object.entries(this.modelCache)) {
      if (now - entry.createdAt > this.CACHE_TTL) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      delete this.modelCache[key]
    }

    console.log(`AI Model cache cleanup: removed ${expiredKeys.length} expired entries`)
  }

  /**
   * Clears all cache entries
   */
  clearCache(): void {
    this.modelCache = {}
    console.log('AI Model cache cleared')
  }

  /**
   * Gets cache statistics for monitoring
   */
  getCacheStats(): {
    size: number
    entries: Array<{ provider: string; model: string; age: number }>
  } {
    const now = Date.now()
    const entries = Object.entries(this.modelCache).map(([key, entry]) => {
      const [provider, model] = key.split(':', 2)
      return {
        provider: provider || 'unknown',
        model: model || 'unknown',
        age: now - entry.createdAt
      }
    })

    return {
      size: Object.keys(this.modelCache).length,
      entries
    }
  }

  /**
   * Determines which provider should handle a given configuration
   */
  private determineProvider(config: AIConfig): AIProvider | null {
    // First, try to find provider by model name patterns
    for (const provider of Object.values(this.providers)) {
      const supportedModels = provider.getSupportedModels()
      if (supportedModels.includes(config.model)) {
        return provider
      }
    }

    // If no exact match, try pattern matching
    const modelLower = config.model.toLowerCase()

    if (modelLower.includes('gpt') || modelLower.includes('openai')) {
      return this.providers['openai'] || null
    }

    if (modelLower.includes('claude')) {
      return this.providers['claude'] || null
    }

    // For custom APIs (non-default base URLs), try to match by provider name patterns or default to OpenAI
    const isCustomAPI =
      config.baseURL &&
      !config.baseURL.includes('api.openai.com') &&
      !config.baseURL.includes('api.anthropic.com')
    if (isCustomAPI) {
      // If using a custom base URL, default to OpenAI provider (most common for custom APIs)
      return this.providers['openai'] || null
    }

    return null
  }

  /**
   * Generates a cache key for a model configuration
   */
  private generateCacheKey(providerName: string, config: AIConfig): string {
    // Include relevant config properties that affect model behavior
    const keyParts = [
      providerName,
      config.model,
      config.apiKey.substring(0, 8), // First 8 chars for uniqueness
      config.baseURL || 'default',
      config.temperature || DEFAULT_AI_CONFIG.temperature,
      config.maxTokens || DEFAULT_AI_CONFIG.maxTokens
    ]

    return keyParts.join(':')
  }

  /**
   * Retrieves a cached model if it exists and is not expired
   */
  private getCachedModel(cacheKey: string): ModelCacheEntry | null {
    const entry = this.modelCache[cacheKey]

    if (!entry) {
      return null
    }

    const now = Date.now()
    if (now - entry.createdAt > this.CACHE_TTL) {
      delete this.modelCache[cacheKey]
      return null
    }

    return entry
  }

  /**
   * Caches a model instance with metadata
   */
  private cacheModel(cacheKey: string, model: AIModel, config: AIConfig): void {
    // Enforce cache size limit
    if (Object.keys(this.modelCache).length >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed()
    }

    const now = Date.now()
    this.modelCache[cacheKey] = {
      model,
      config: { ...config },
      createdAt: now,
      lastUsed: now
    }
  }

  /**
   * Evicts the least recently used cache entry
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of Object.entries(this.modelCache)) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      delete this.modelCache[oldestKey]
    }
  }

  /**
   * Clears cache entries for a specific provider
   */
  private clearProviderCache(providerName: string): void {
    const keysToDelete = Object.keys(this.modelCache).filter((key) =>
      key.startsWith(providerName + ':')
    )

    for (const key of keysToDelete) {
      delete this.modelCache[key]
    }
  }

  /**
   * Gets model capabilities from constants or defaults
   */
  private getModelCapabilities(providerName: string, modelName: string): ModelCapabilities {
    const defaultCapabilities: ModelCapabilities = {
      supportVision: false,
      supportReasoning: false,
      supportToolCalls: false,
      maxContextLength: 4096
    }

    try {
      // Look up capabilities from AI_MODELS constants
      const providerModels = AI_MODELS[providerName.toUpperCase() as keyof typeof AI_MODELS]
      if (providerModels && typeof providerModels === 'object') {
        const modelInfo = providerModels[modelName as keyof typeof providerModels]
        if (modelInfo && typeof modelInfo === 'object' && 'capabilities' in modelInfo) {
          return {
            supportVision: modelInfo.capabilities.supportVision || false,
            supportReasoning: modelName.includes('o1') || false, // o1 models support reasoning
            supportToolCalls: modelInfo.capabilities.supportToolCalls || false,
            maxContextLength: modelInfo.capabilities.maxContextLength || 4096
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to get capabilities for ${providerName}/${modelName}:`, error)
    }

    return defaultCapabilities
  }
}

// Singleton instance
const aiModelManager = new AIModelManager()

// Export the singleton instance and key functions
export default aiModelManager

/**
 * Convenience functions that delegate to the singleton
 */
export const registerModel = (provider: AIProvider): void => {
  aiModelManager.registerProvider(provider)
}

export const getModel = (config: AIConfig): Promise<AIModel> => {
  return aiModelManager.getModel(config)
}

export const getModelFromConfig = (modelConfig: ModelConfig): Promise<AIModel> => {
  return aiModelManager.getModelFromConfig(modelConfig)
}

export const listModels = (): Array<{
  provider: string
  model: string
  capabilities: ModelCapabilities
}> => {
  return aiModelManager.listAllModels()
}

export const listProviders = (): Array<{ name: string; displayName: string; models: string[] }> => {
  return aiModelManager.listProviders()
}

export const validateConfig = (config: AIConfig): boolean => {
  return aiModelManager.validateConfiguration(config)
}

export const getDefaultConfig = (providerName: string): Partial<AIConfig> => {
  return aiModelManager.getProviderDefaultConfig(providerName)
}

export const clearModelCache = (): void => {
  aiModelManager.clearCache()
}

export const cleanupModelCache = (): void => {
  aiModelManager.cleanupCache()
}

export const getModelCacheStats = () => {
  return aiModelManager.getCacheStats()
}

/**
 * Initialize automatic cache cleanup
 * Runs every 15 minutes to remove expired entries
 */
const CLEANUP_INTERVAL = 15 * 60 * 1000 // 15 minutes

let cleanupTimer: NodeJS.Timeout | null = null

export const startCacheCleanup = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
  }

  cleanupTimer = setInterval(() => {
    aiModelManager.cleanupCache()
  }, CLEANUP_INTERVAL)

  console.log('AI Model cache cleanup started')
}

export const stopCacheCleanup = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer)
    cleanupTimer = null
    console.log('AI Model cache cleanup stopped')
  }
}

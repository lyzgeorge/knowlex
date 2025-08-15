import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Settings service for managing application configuration
 *
 * Features:
 * - Load environment variables from .env file
 * - Provide API configuration for AI models
 * - Manage application settings
 * - Support for different model providers
 */

export interface APIProviderConfig {
  provider: string
  apiKey: string
  baseURL: string
  model: string
  reasoningEffort?: 'low' | 'medium' | 'high'
  timeout?: number
}

export interface AppSettings {
  apiProviders: {
    openai: APIProviderConfig
    claude: APIProviderConfig
    embedding: APIProviderConfig
  }
  defaultProvider: string
  logLevel: string
  nodeEnv: string
}

class SettingsService {
  private settings: AppSettings | null = null
  private envLoaded = false

  constructor() {
    this.loadEnvironment()
  }

  /**
   * Load environment variables from .env file
   */
  private loadEnvironment() {
    if (this.envLoaded) return

    try {
      // Find .env file in app root
      const appPath = app.getAppPath()
      const envPath = path.join(appPath, '.env')

      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        const envLines = envContent.split('\n')

        envLines.forEach((line) => {
          const trimmedLine = line.trim()
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=')
            const value = valueParts.join('=').trim()
            if (key && value) {
              process.env[key] = value
            }
          }
        })

        console.log('Environment variables loaded from .env file')
      } else {
        console.log('No .env file found, using system environment variables')
      }

      this.envLoaded = true
    } catch (error) {
      console.error('Failed to load environment variables:', error)
    }
  }

  /**
   * Get all application settings
   */
  getSettings(): AppSettings {
    if (this.settings) {
      return this.settings
    }

    // Build settings from environment variables
    this.settings = {
      apiProviders: {
        openai: {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY || '',
          baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
          model: process.env.OPENAI_MODEL || 'gpt-4',
          reasoningEffort: process.env.OPENAI_REASONING_EFFORT as
            | 'low'
            | 'medium'
            | 'high'
            | undefined,
          timeout: 30000
        },
        claude: {
          provider: 'claude',
          apiKey: process.env.CLAUDE_API_KEY || '',
          baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
          model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
          reasoningEffort: process.env.CLAUDE_REASONING_EFFORT as
            | 'low'
            | 'medium'
            | 'high'
            | undefined,
          timeout: 30000
        },
        embedding: {
          provider: 'embedding',
          apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || '',
          baseURL: process.env.EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
          model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
          timeout: 30000
        }
      },
      defaultProvider: process.env.DEFAULT_PROVIDER || 'openai',
      logLevel: process.env.LOG_LEVEL || 'info',
      nodeEnv: process.env.NODE_ENV || 'development'
    }

    return this.settings
  }

  /**
   * Get configuration for a specific API provider
   */
  getProviderConfig(provider: string): APIProviderConfig | null {
    const settings = this.getSettings()
    return settings.apiProviders[provider as keyof typeof settings.apiProviders] || null
  }

  /**
   * Get default provider configuration
   */
  getDefaultProvider(): APIProviderConfig | null {
    const settings = this.getSettings()
    return this.getProviderConfig(settings.defaultProvider)
  }

  /**
   * Check if a provider is properly configured
   */
  isProviderConfigured(provider: string): boolean {
    const config = this.getProviderConfig(provider)
    return !!(config && config.apiKey && config.baseURL && config.model)
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): string[] {
    const settings = this.getSettings()
    return Object.keys(settings.apiProviders).filter((provider) =>
      this.isProviderConfigured(provider)
    )
  }

  /**
   * Update provider configuration (for runtime changes)
   */
  updateProviderConfig(provider: string, config: Partial<APIProviderConfig>) {
    if (!this.settings) {
      this.getSettings()
    }

    if (
      this.settings &&
      this.settings.apiProviders[provider as keyof typeof this.settings.apiProviders]
    ) {
      Object.assign(
        this.settings.apiProviders[provider as keyof typeof this.settings.apiProviders],
        config
      )
    }
  }

  /**
   * Reload settings from environment
   */
  reload() {
    this.settings = null
    this.envLoaded = false
    this.loadEnvironment()
    this.getSettings()
  }
}

// Export singleton instance
export const settingsService = new SettingsService()

// Export for tests
export { SettingsService }

import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Settings service for managing application configuration
 *
 * Features:
 * - Load environment variables from app.env file
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
  // Note: apiProviders simplified since OpenAI config is handled by openai-adapter
  apiProviders: Record<string, APIProviderConfig>
  defaultProvider: string
  logLevel: string
  nodeEnv: string
  defaultModelId?: string | null
}

class SettingsService {
  private settings: AppSettings | null = null
  private envLoaded = false

  constructor() {
    this.loadEnvironment()
  }

  /**
   * Load environment variables from app.env file
   */
  private loadEnvironment() {
    if (this.envLoaded) return

    try {
      // Find app.env file in app root
      const appPath = app.getAppPath()
      const envPath = path.join(appPath, 'app.env')

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

        console.log('Environment variables loaded from app.env file')
      } else {
        console.log('No app.env file found, using system environment variables')
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
      // Note: OpenAI configuration is handled directly by openai-adapter service
      // to avoid duplication and ensure comprehensive parameter support
      apiProviders: {},
      defaultProvider: 'openai', // Static default since providers are managed elsewhere
      logLevel: process.env.LOG_LEVEL || 'info',
      nodeEnv: process.env.NODE_ENV || 'development'
    }

    return this.settings!
  }

  /**
   * Update provider configuration (for runtime changes)
   * Note: Providers are now managed by their respective adapters (e.g., openai-adapter)
   */
  updateProviderConfig(provider: string, _config: Partial<APIProviderConfig>) {
    // No-op: Provider configurations are managed elsewhere to avoid duplication
    console.warn(
      `updateProviderConfig called for ${provider} but providers are managed by their respective adapters`
    )
  }

  /**
   * Update settings (runtime changes)
   */
  updateSettings(updates: Partial<AppSettings>) {
    if (!this.settings) {
      this.getSettings()
    }

    if (this.settings) {
      Object.assign(this.settings, updates)
      console.log('Settings updated:', updates)
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

// Export convenience functions
export const getSettings = () => settingsService.getSettings()
export const updateSettings = (updates: Partial<AppSettings>) =>
  settingsService.updateSettings(updates)

// Export for tests
export { SettingsService }

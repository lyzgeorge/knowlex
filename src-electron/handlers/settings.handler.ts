/**
 * Settings Handler
 *
 * Handles settings-related IPC requests including getting/setting app settings
 * and testing API connections.
 */

import { IpcMainEvent } from 'electron'
import { BaseIPCHandler } from './base.handler'
import { IPCMessage, IPCResponse, IPC_CHANNELS } from '../types/ipc.types'
import { OpenAIClient } from '../services/ai/openai.client'
import { DatabaseService } from '../services/database/database.service'
import { ipcManager } from './ipc.manager'
import {
  AppSettings,
  TestAPIRequest,
  TestAPIResponse,
  ChatAPIConfig,
  EmbeddingAPIConfig,
} from '@knowlex/types'

export class SettingsHandler extends BaseIPCHandler {
  protected handlerName = 'SettingsHandler'
  private openaiService: OpenAIClient
  private databaseService: DatabaseService

  constructor(openaiService: OpenAIClient, databaseService: DatabaseService) {
    super()
    this.openaiService = openaiService
    this.databaseService = databaseService
  }

  /**
   * Register all settings-related IPC handlers
   */
  registerHandlers(): void {
    ipcManager.registerHandler(IPC_CHANNELS.SETTINGS_GET, this.handleGetSettings.bind(this))
    ipcManager.registerHandler(IPC_CHANNELS.SETTINGS_SET, this.handleSetSettings.bind(this))
    ipcManager.registerHandler(IPC_CHANNELS.SETTINGS_TEST_API, this.handleTestAPI.bind(this))
  }

  /**
   * Handle get settings request
   */
  private async handleGetSettings(
    message: IPCMessage<{ channel: string; data: { keys?: string[] } }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: requestData } = data
      const keys = requestData.keys

      const settings = await this.loadSettings()

      // If specific keys are requested, filter the settings
      if (keys && keys.length > 0) {
        const filteredSettings: Partial<AppSettings> = {}
        for (const key of keys) {
          if (key in settings) {
            ;(filteredSettings as any)[key] = (settings as any)[key]
          }
        }
        return filteredSettings
      }

      return settings
    })
  }

  /**
   * Handle set settings request
   */
  private async handleSetSettings(
    message: IPCMessage<{ channel: string; data: Partial<AppSettings> }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: settingsUpdate } = data

      // Load current settings
      const currentSettings = await this.loadSettings()

      // Merge with updates
      const newSettings: AppSettings = {
        ...currentSettings,
        ...settingsUpdate,
      }

      // Validate settings
      this.validateSettings(newSettings)

      // Save settings to database
      await this.saveSettings(newSettings)

      // Update OpenAI service configuration if chat API settings changed
      if (settingsUpdate.chatApi) {
        this.openaiService.updateConfig(newSettings.chatApi)
        this.log('info', 'Updated OpenAI service configuration')
      }

      this.log('info', 'Settings updated successfully')
      return { success: true }
    })
  }

  /**
   * Handle test API request
   */
  private async handleTestAPI(
    message: IPCMessage<{ channel: string; data: TestAPIRequest }>,
    _event: IpcMainEvent
  ): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const { data: requestData } = data

      this.validateRequired(requestData, ['type', 'config'])

      const startTime = Date.now()

      try {
        let result: TestAPIResponse

        switch (requestData.type) {
          case 'chat':
            result = await this.testChatAPI(requestData.config as ChatAPIConfig)
            break
          case 'embedding':
            result = await this.testEmbeddingAPI(requestData.config as EmbeddingAPIConfig)
            break
          case 'rerank':
            // TODO: Implement rerank API testing when rerank service is created
            result = { success: false, error: 'Rerank API testing not implemented yet' }
            break
          default:
            throw new Error(`Unknown API type: ${requestData.type}`)
        }

        result.latency = Date.now() - startTime
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          latency: Date.now() - startTime,
        }
      }
    })
  }

  /**
   * Test Chat API connection
   */
  private async testChatAPI(config: ChatAPIConfig): Promise<TestAPIResponse> {
    try {
      // Create a temporary OpenAI service instance for testing
      const testService = new OpenAIClient(config)

      const result = await testService.testConnection()

      return {
        success: result.success,
        latency: result.latency,
        error: result.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Test Embedding API connection
   */
  private async testEmbeddingAPI(config: EmbeddingAPIConfig): Promise<TestAPIResponse> {
    try {
      // TODO: Implement embedding API testing when embedding service is created
      // For now, just validate the configuration format
      this.validateRequired(config, ['apiKey', 'baseUrl', 'model'])

      return {
        success: true,
        error: 'Embedding API testing not fully implemented yet',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Load settings from database
   */
  private async loadSettings(): Promise<AppSettings> {
    try {
      const sqliteManager = this.databaseService.getSQLiteManager()

      const settingsRows = await sqliteManager.queryAll<{ key: string; value: string }>(
        'SELECT key, value FROM app_settings'
      )

      // Default settings
      const defaultSettings: AppSettings = {
        chatApi: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        },
        embeddingApi: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
        },
        theme: 'system',
        language: 'en',
        ragSettings: {
          enabled: true,
          topK: 5,
          threshold: 0.2,
        },
      }

      // Merge with saved settings
      const settings = { ...defaultSettings }

      for (const row of settingsRows) {
        try {
          const value = JSON.parse(row.value)
          this.setNestedProperty(settings, row.key, value)
        } catch (error) {
          this.log('warn', `Failed to parse setting ${row.key}:`, error)
        }
      }

      return settings
    } catch (error) {
      this.log('error', 'Failed to load settings, using defaults', error)

      // Return default settings if loading fails
      return {
        chatApi: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
        },
        embeddingApi: {
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          model: 'text-embedding-3-small',
        },
        theme: 'system',
        language: 'en',
        ragSettings: {
          enabled: true,
          topK: 5,
          threshold: 0.2,
        },
      }
    }
  }

  /**
   * Save settings to database
   */
  private async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const sqliteManager = this.databaseService.getSQLiteManager()

      // Flatten settings object for storage
      const flatSettings = this.flattenObject(settings)

      // Save each setting
      for (const [key, value] of Object.entries(flatSettings)) {
        await sqliteManager.execute(
          'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
          [key, JSON.stringify(value)]
        )
      }

      this.log('info', 'Settings saved successfully')
    } catch (error) {
      this.log('error', 'Failed to save settings', error)
      throw error
    }
  }

  /**
   * Validate settings object
   */
  private validateSettings(settings: AppSettings): void {
    // Validate chat API settings
    if (settings.chatApi) {
      this.validateRequired(settings.chatApi, ['baseUrl', 'model'])

      if (settings.chatApi.apiKey && settings.chatApi.apiKey.length < 10) {
        throw new Error('Chat API key appears to be invalid (too short)')
      }
    }

    // Validate embedding API settings
    if (settings.embeddingApi) {
      this.validateRequired(settings.embeddingApi, ['baseUrl', 'model'])

      if (settings.embeddingApi.apiKey && settings.embeddingApi.apiKey.length < 10) {
        throw new Error('Embedding API key appears to be invalid (too short)')
      }
    }

    // Validate theme
    if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
      throw new Error('Invalid theme value')
    }

    // Validate language
    if (settings.language && !['en', 'zh'].includes(settings.language)) {
      throw new Error('Invalid language value')
    }

    // Validate RAG settings
    if (settings.ragSettings) {
      if (typeof settings.ragSettings.enabled !== 'boolean') {
        throw new Error('RAG enabled setting must be boolean')
      }

      if (
        settings.ragSettings.topK &&
        (settings.ragSettings.topK < 1 || settings.ragSettings.topK > 20)
      ) {
        throw new Error('RAG topK must be between 1 and 20')
      }

      if (
        settings.ragSettings.threshold &&
        (settings.ragSettings.threshold < 0 || settings.ragSettings.threshold > 1)
      ) {
        throw new Error('RAG threshold must be between 0 and 1')
      }
    }
  }

  /**
   * Flatten nested object for database storage
   */
  private flattenObject(obj: any, prefix: string = ''): Record<string, any> {
    const flattened: Record<string, any> = {}

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }

    return flattened
  }

  /**
   * Set nested property in object
   */
  private setNestedProperty(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }
}

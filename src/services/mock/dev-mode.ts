/**
 * Development Mode Mock Service Auto-Switcher
 *
 * Automatically switches between mock and real services based on environment
 * and development configuration. Provides seamless integration for development workflow.
 */

import { mockDataManager } from './manager'
import { ipcMockService } from './ipc.mock'

export interface DevModeConfig {
  enabled: boolean
  autoSwitch: boolean
  defaultScenario: string
  services: {
    ipc: boolean
    openai: boolean
    database: boolean
  }
  hotReload: boolean
  debugMode: boolean
}

export class DevModeManager {
  private config: DevModeConfig
  private isInitialized = false
  private originalServices: Map<string, unknown> = new Map()

  constructor() {
    this.config = this.getDefaultConfig()
  }

  /**
   * Initialize development mode based on environment
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    // Check if we're in development mode
    const isDev = this.isDevelopmentMode()

    if (!isDev) {
      // [Dev Mode] Production mode detected, mock services disabled
      return
    }

    // Load configuration from environment or config file
    await this.loadConfiguration()

    if (this.config.enabled) {
      await this.enableMockServices()
      this.setupHotReload()
      this.setupDebugMode()

      // [Dev Mode] Mock services initialized
      // [Dev Mode] Current scenario: mockDataManager.getCurrentScenario()
    }

    this.isInitialized = true
  }

  /**
   * Enable mock services based on configuration
   */
  async enableMockServices(): Promise<void> {
    // Switch to default scenario
    mockDataManager.switchScenario(this.config.defaultScenario)

    // Store original services for potential restoration
    this.storeOriginalServices()

    // Replace services with mocks if enabled
    if (this.config.services.ipc) {
      this.replaceipcService()
    }

    if (this.config.services.openai) {
      this.replaceOpenAIService()
    }

    if (this.config.services.database) {
      this.replaceDatabaseService()
    }

    // [Dev Mode] Mock services enabled: this.config.services
  }

  /**
   * Disable mock services and restore originals
   */
  async disableMockServices(): Promise<void> {
    this.restoreOriginalServices()
    // [Dev Mode] Mock services disabled, original services restored
  }

  /**
   * Toggle mock services on/off
   */
  async toggleMockServices(): Promise<boolean> {
    if (this.config.enabled) {
      await this.disableMockServices()
      this.config.enabled = false
    } else {
      await this.enableMockServices()
      this.config.enabled = true
    }

    return this.config.enabled
  }

  /**
   * Update development mode configuration
   */
  updateConfig(newConfig: Partial<DevModeConfig>): void {
    this.config = { ...this.config, ...newConfig }

    if (this.isInitialized && this.config.enabled) {
      // Re-initialize with new config
      this.initialize()
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): DevModeConfig {
    return { ...this.config }
  }

  /**
   * Check if specific service is mocked
   */
  isServiceMocked(service: 'ipc' | 'openai' | 'database'): boolean {
    return this.config.enabled && this.config.services[service]
  }

  /**
   * Get development mode _status
   */
  getStatus(): {
    enabled: boolean
    initialized: boolean
    scenario: string
    mockedServices: string[]
    isDevelopment: boolean
  } {
    const mockedServices = Object.entries(this.config.services)
      .filter(([_, enabled]) => enabled)
      .map(([service, _]) => service)

    return {
      enabled: this.config.enabled,
      initialized: this.isInitialized,
      scenario: mockDataManager.getCurrentScenario(),
      mockedServices,
      isDevelopment: this.isDevelopmentMode(),
    }
  }

  private isDevelopmentMode(): boolean {
    // Check various indicators for development mode
    return (
      process.env.NODE_ENV === 'development' ||
      process.env.IS_DEV === 'true' ||
      process.env.ELECTRON_IS_DEV === '1' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    )
  }

  private async loadConfiguration(): Promise<void> {
    try {
      // Try to load from localStorage first
      const savedConfig = localStorage.getItem('knowlex-dev-mode-config')
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig)
        this.config = { ...this.config, ...parsed }
      }

      // Override with environment variables if present
      if (process.env.MOCK_SERVICES_ENABLED) {
        this.config.enabled = process.env.MOCK_SERVICES_ENABLED === 'true'
      }

      if (process.env.MOCK_DEFAULT_SCENARIO) {
        this.config.defaultScenario = process.env.MOCK_DEFAULT_SCENARIO
      }

      if (process.env.MOCK_DEBUG_MODE) {
        this.config.debugMode = process.env.MOCK_DEBUG_MODE === 'true'
      }
    } catch (error) {
      // console.warn('[Dev Mode] Failed to load configuration:', error)
    }
  }

  private saveConfiguration(): void {
    try {
      localStorage.setItem('knowlex-dev-mode-config', JSON.stringify(this.config))
    } catch (error) {
      // console.warn('[Dev Mode] Failed to save configuration:', error)
    }
  }

  private storeOriginalServices(): void {
    // Store references to original services
    if (window.electronAPI) {
      this.originalServices.set('electronAPI', window.electronAPI)
    }

    // Store other service references as needed
  }

  private restoreOriginalServices(): void {
    // Restore original services
    const originalElectronAPI = this.originalServices.get('electronAPI')
    if (originalElectronAPI) {
      window.electronAPI = originalElectronAPI
    }
  }

  private replaceipcService(): void {
    if (!window.electronAPI) {
      return
    }

    // Create mock electronAPI
    const mockElectronAPI = {
      ...window.electronAPI,
      send: (channel: string, data: unknown) => {
        ipcMockService.send(channel, data)
      },
      invoke: async (channel: string, data: unknown) => {
        return ipcMockService.invoke(channel as string, data as unknown)
      },
      on: (channel: string, callback: (data: unknown) => void) => {
        ipcMockService.on(channel, callback)
      },
    }

    // Replace the global electronAPI
    window.electronAPI = mockElectronAPI
  }

  private replaceOpenAIService(): void {
    // This would replace the OpenAI service in the main process
    // For now, we'll just log that it's enabled
    // [Dev Mode] OpenAI service mocking enabled
  }

  private replaceDatabaseService(): void {
    // This would replace the database service in the main process
    // For now, we'll just log that it's enabled
    // [Dev Mode] Database service mocking enabled
  }

  private setupHotReload(): void {
    if (!this.config.hotReload) {
      return
    }

    // Listen for configuration changes
    window.addEventListener('storage', event => {
      if (event.key === 'knowlex-dev-mode-config' && event.newValue) {
        try {
          const newConfig = JSON.parse(event.newValue)
          this.updateConfig(newConfig)
          // [Dev Mode] Configuration hot-reloaded
        } catch (error) {
          // console.warn('[Dev Mode] Failed to hot-reload configuration:', error)
        }
      }
    })

    // Setup keyboard shortcuts for quick scenario switching
    window.addEventListener('keydown', event => {
      if (event.ctrlKey && event.shiftKey && event.altKey) {
        switch (event.key) {
          case '1':
            mockDataManager.switchScenario('default')
            // [Dev Mode] Switched to default scenario
            break
          case '2':
            mockDataManager.switchScenario('empty')
            // [Dev Mode] Switched to empty scenario
            break
          case '3':
            mockDataManager.switchScenario('large-dataset')
            // [Dev Mode] Switched to large-dataset scenario
            break
          case '0':
            this.toggleMockServices()
            break
        }
      }
    })
  }

  private setupDebugMode(): void {
    if (!this.config.debugMode) {
      return
    }

    // Add global debug functions
    ;(window as unknown as { mockDebug: object }).mockDebug = {
      switchScenario: (scenario: string) => mockDataManager.switchScenario(scenario),
      getStats: () => mockDataManager.getStats(),
      getScenarios: () => mockDataManager.getAvailableScenarios(),
      resetServices: () => mockDataManager.reset(),
      validateServices: () => mockDataManager.validateServices(),
      exportData: () => mockDataManager.exportMockData(),
      getStatus: () => this.getStatus(),
      toggleMocks: () => this.toggleMockServices(),
    }

    // [Dev Mode] Debug mode enabled. Use window.mockDebug for debugging
    // [Dev Mode] Available debug commands: Object.keys((window as any).mockDebug)
  }

  private getDefaultConfig(): DevModeConfig {
    return {
      enabled: true,
      autoSwitch: true,
      defaultScenario: 'default',
      services: {
        ipc: true,
        openai: true,
        database: true,
      },
      hotReload: true,
      debugMode: true,
    }
  }
}

// Export singleton instance
export const devModeManager = new DevModeManager()

// Auto-initialize in development mode
if (typeof window !== 'undefined') {
  devModeManager.initialize().catch(_error => {
    // console.error('[Dev Mode] Failed to initialize:', error)
  })
}

// Export convenience functions
export function enableDevMode(config?: Partial<DevModeConfig>): Promise<void> {
  if (config) {
    devModeManager.updateConfig(config)
  }
  return devModeManager.enableMockServices()
}

export function disableDevMode(): Promise<void> {
  return devModeManager.disableMockServices()
}

export function isDevModeEnabled(): boolean {
  return devModeManager.getStatus().enabled
}

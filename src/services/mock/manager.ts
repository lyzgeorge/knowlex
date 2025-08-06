/**
 * Mock Data Manager
 *
 * Central manager for coordinating mock services and test scenarios.
 * Provides unified interface for switching between different test scenarios
 * and managing mock service configurations.
 */

import { ipcMockService, MockScenario } from './ipc.mock'
import { openaiMockService, MockOpenAIConfig } from './openai.mock'
import { databaseMockService, DatabaseMockScenario } from './database.mock'

export interface MockManagerConfig {
  scenario: string
  openaiConfig?: Partial<MockOpenAIConfig>
  enableLogging?: boolean
  errorRate?: number
  responseDelay?: number
}

export interface ScenarioInfo {
  name: string
  description: string
  services: string[]
}

export class MockDataManager {
  private currentScenario = 'default'
  private loggingEnabled = true
  private scenarios: Map<string, ScenarioInfo> = new Map()

  constructor() {
    this.initializeScenarios()
  }

  /**
   * Switch all mock services to a specific scenario
   */
  switchScenario(scenarioName: string, config?: Partial<MockManagerConfig>): void {
    if (!this.scenarios.has(scenarioName)) {
      throw new Error(`Unknown scenario: ${scenarioName}`)
    }

    this.currentScenario = scenarioName

    // Switch IPC mock scenario
    ipcMockService.switchScenario(scenarioName)

    // Switch database mock scenario
    databaseMockService.switchScenario(scenarioName)

    // Update OpenAI mock configuration if provided
    if (config?.openaiConfig) {
      openaiMockService.updateConfig(config.openaiConfig)
    }

    // Apply global configuration
    if (config?.errorRate !== undefined) {
      openaiMockService.updateConfig({ errorRate: config.errorRate })
    }

    if (config?.responseDelay !== undefined) {
      openaiMockService.updateConfig({ responseDelay: config.responseDelay })
    }

    this.loggingEnabled = config?.enableLogging ?? true

    this.log(`Switched to scenario: ${scenarioName}`)
  }

  /**
   * Get current scenario name
   */
  getCurrentScenario(): string {
    return this.currentScenario
  }

  /**
   * Get all available scenarios
   */
  getAvailableScenarios(): ScenarioInfo[] {
    return Array.from(this.scenarios.values())
  }

  /**
   * Create a custom scenario configuration
   */
  createCustomScenario(
    name: string,
    description: string,
    _config: {
      ipcData?: Partial<MockScenario['data']>
      databaseData?: Partial<DatabaseMockScenario['data']>
      openaiConfig?: Partial<MockOpenAIConfig>
    }
  ): void {
    // Register the scenario
    this.scenarios.set(name, {
      name,
      description,
      services: ['ipc', 'database', 'openai'],
    })

    // TODO: Implement custom scenario data injection
    // This would require extending the mock services to accept custom data

    this.log(`Created custom scenario: ${name}`)
  }

  /**
   * Reset all mock services to default state
   */
  reset(): void {
    this.switchScenario('default')
    this.log('Reset all mock services to default state')
  }

  /**
   * Get mock service statistics
   */
  async getStats(): Promise<{
    currentScenario: string
    ipcScenarios: string[]
    databaseScenarios: string[]
    openaiConfig: {
      model: string
      responseDelay: number
      errorRate: number
    }
    databaseStats: unknown
  }> {
    const databaseStats = await databaseMockService.getStats()

    return {
      currentScenario: this.currentScenario,
      ipcScenarios: ipcMockService.getAvailableScenarios(),
      databaseScenarios: databaseMockService.getAvailableScenarios(),
      openaiConfig: {
        model: openaiMockService['config'].model,
        responseDelay: openaiMockService['config'].responseDelay ?? 0,
        errorRate: openaiMockService['config'].errorRate ?? 0,
      },
      databaseStats,
    }
  }

  /**
   * Enable or disable logging for all mock services
   */
  setLogging(enabled: boolean): void {
    this.loggingEnabled = enabled
    this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Simulate various error conditions for testing
   */
  simulateError(service: 'ipc' | 'openai' | 'database', errorType: string): void {
    switch (service) {
      case 'openai':
        if (errorType === 'rate_limit') {
          openaiMockService.updateConfig({ errorRate: 1.0 })
          setTimeout(() => {
            openaiMockService.updateConfig({ errorRate: 0.05 })
          }, 5000)
        }
        break

      case 'database':
        // Database error simulation would be implemented here
        break

      case 'ipc':
        // IPC error simulation would be implemented here
        break
    }

    this.log(`Simulated ${errorType} error for ${service} service`)
  }

  /**
   * Generate test data for performance testing
   */
  generateTestData(type: 'small' | 'medium' | 'large'): void {
    const scenarioMap = {
      small: 'default',
      medium: 'default', // Could be extended
      large: 'large-dataset',
    }

    this.switchScenario(scenarioMap[type])
    this.log(`Generated ${type} test dataset`)
  }

  /**
   * Export current mock data for debugging
   */
  async exportMockData(): Promise<{
    scenario: string
    timestamp: string
    data: unknown
  }> {
    const stats = await this.getStats()

    return {
      scenario: this.currentScenario,
      timestamp: new Date().toISOString(),
      data: {
        stats,
        scenarios: this.getAvailableScenarios(),
      },
    }
  }

  /**
   * Validate mock service integrity
   */
  async validateServices(): Promise<{
    ipc: boolean
    openai: boolean
    database: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    let ipcValid = true
    let openaiValid = true
    let databaseValid = true

    try {
      // Test IPC service
      await ipcMockService.invoke('project:list@v1.0.0' as any, undefined)
    } catch (error) {
      ipcValid = false
      errors.push(`IPC service error: ${(error as Error)._message}`)
    }

    try {
      // Test OpenAI service
      await openaiMockService.testConnection()
    } catch (error) {
      openaiValid = false
      errors.push(`OpenAI service error: ${(error as Error)._message}`)
    }

    try {
      // Test Database service
      await databaseMockService.query('SELECT 1')
    } catch (error) {
      databaseValid = false
      errors.push(`Database service error: ${(error as Error)._message}`)
    }

    return {
      ipc: ipcValid,
      openai: openaiValid,
      database: databaseValid,
      errors,
    }
  }

  private initializeScenarios(): void {
    // Default scenarios
    this.scenarios.set('default', {
      name: 'default',
      description: 'Default scenario with sample data for development',
      services: ['ipc', 'database', 'openai'],
    })

    this.scenarios.set('empty', {
      name: 'empty',
      description: 'Empty scenario with no data for testing edge cases',
      services: ['ipc', 'database', 'openai'],
    })

    this.scenarios.set('large-dataset', {
      name: 'large-dataset',
      description: 'Large dataset scenario for performance testing',
      services: ['ipc', 'database', 'openai'],
    })

    this.scenarios.set('error-prone', {
      name: 'error-prone',
      description: 'Scenario with high error rates for error handling testing',
      services: ['ipc', 'database', 'openai'],
    })

    this.scenarios.set('slow-response', {
      name: 'slow-response',
      description: 'Scenario with slow response times for timeout testing',
      services: ['ipc', 'database', 'openai'],
    })

    this.scenarios.set('offline', {
      name: 'offline',
      description: 'Scenario simulating offline/network failure conditions',
      services: ['ipc', 'database', 'openai'],
    })
  }

  private log(_message: string): void {
    if (this.loggingEnabled) {
      // [Mock Manager] ${_message}
    }
  }
}

// Export singleton instance
export const mockDataManager = new MockDataManager()

// Export convenience functions
export function switchMockScenario(scenario: string, config?: Partial<MockManagerConfig>): void {
  mockDataManager.switchScenario(scenario, config)
}

export function resetMockServices(): void {
  mockDataManager.reset()
}

export function getMockStats(): Promise<{
  currentScenario: string
  ipcScenarios: string[]
  databaseScenarios: string[]
  openaiConfig: {
    model: string
    responseDelay: number
    errorRate: number
  }
  databaseStats: unknown
}> {
  return mockDataManager.getStats()
}

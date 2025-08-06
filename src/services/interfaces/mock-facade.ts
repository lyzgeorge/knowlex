/**
 * Mock Service Facade Interface
 *
 * Lightweight interface for mock services that can be used in business code
 * without directly importing mock implementations.
 */

export interface ScenarioInfo {
  name: string
  description: string
}

export interface MockStats {
  currentScenario: string
  ipcScenarios?: unknown[]
  openaiConfig?: {
    model?: string
    responseDelay?: number
    errorRate?: number
  }
  databaseScenarios?: unknown[]
  databaseStats?: {
    totalProjects?: number
    totalMessages?: number
    databaseSize?: string
    tableCount?: number
    indexCount?: number
  }
}

export interface MockServiceFacade {
  switchScenario(scenario: string): void
  getAvailableScenarios(): ScenarioInfo[]
  getMockStats(): Promise<MockStats>
  validateServices(): Promise<Record<string, unknown>>
  isEnabled(): boolean
  exportMockData(): Promise<Record<string, unknown>>
}

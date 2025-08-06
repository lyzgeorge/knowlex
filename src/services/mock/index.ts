/**
 * Mock Services Index
 *
 * Central export point for all mock services and utilities.
 * Provides easy access to mock functionality for development and testing.
 */

// Core mock services
export { ipcMockService, IPCMockService, type MockScenario } from './ipc.mock'
export {
  openaiMockService,
  OpenAIMockService,
  createOpenAIMockService,
  type MockOpenAIConfig,
} from './openai.mock'
export {
  databaseMockService,
  DatabaseMockService,
  type DatabaseMockScenario,
} from './database.mock'

// Mock data manager
export {
  mockDataManager,
  MockDataManager,
  switchMockScenario,
  resetMockServices,
  getMockStats,
  type MockManagerConfig,
  type ScenarioInfo,
} from './manager'

// Development mode utilities
export {
  devModeManager,
  DevModeManager,
  enableDevMode,
  disableDevMode,
  isDevModeEnabled,
  type DevModeConfig,
} from './dev-mode'

// Utility functions for easy mock setup
export function initializeMockServices(scenario: string = 'default'): void {
  mockDataManager.switchScenario(scenario)
  // [Mock Services] Initialized with scenario: ${scenario}
}

export function createTestEnvironment(scenario: string, config?: Partial<MockManagerConfig>): void {
  mockDataManager.switchScenario(scenario, config)
  // [Mock Services] Test environment created: ${scenario}
}

export async function validateMockEnvironment(): Promise<boolean> {
  const validation = await mockDataManager.validateServices()
  const isValid = validation.ipc && validation.openai && validation.database

  if (!isValid) {
    // console.error('[Mock Services] Validation failed:', validation.errors)
  } else {
    // [Mock Services] Environment validation passed
  }

  return isValid
}

// Export types for external use
export type {
  MockScenario,
  MockOpenAIConfig,
  DatabaseMockScenario,
  MockManagerConfig,
  ScenarioInfo,
  DevModeConfig,
}

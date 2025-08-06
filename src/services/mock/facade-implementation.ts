/**
 * Mock Service Facade Implementation
 *
 * Concrete implementation of the MockServiceFacade interface.
 * Only available in development/test builds.
 */

import { MockServiceFacade, ScenarioInfo, MockStats } from '../interfaces/mock-facade'
import { mockDataManager, getMockStats, switchMockScenario, isDevModeEnabled } from './index'

export class MockServiceFacadeImpl implements MockServiceFacade {
  switchScenario(scenario: string): void {
    switchMockScenario(scenario)
  }

  getAvailableScenarios(): ScenarioInfo[] {
    return mockDataManager.getAvailableScenarios()
  }

  async getMockStats(): Promise<MockStats> {
    return await getMockStats()
  }

  async validateServices(): Promise<Record<string, unknown>> {
    return await mockDataManager.validateServices()
  }

  isEnabled(): boolean {
    return isDevModeEnabled()
  }

  async exportMockData(): Promise<Record<string, unknown>> {
    return await mockDataManager.exportMockData()
  }
}

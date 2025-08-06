/**
 * Mock Data Manager Tests
 */

import { mockDataManager } from '../manager'

describe('MockDataManager', () => {
  beforeEach(() => {
    mockDataManager.reset()
  })

  describe('Scenario Management', () => {
    it('should start with default scenario', () => {
      expect(mockDataManager.getCurrentScenario()).toBe('default')
    })

    it('should switch scenarios', () => {
      mockDataManager.switchScenario('empty')
      expect(mockDataManager.getCurrentScenario()).toBe('empty')
    })

    it('should list available scenarios', () => {
      const scenarios = mockDataManager.getAvailableScenarios()

      expect(Array.isArray(scenarios)).toBe(true)
      expect(scenarios.length).toBeGreaterThan(0)

      const scenarioNames = scenarios.map(s => s.name)
      expect(scenarioNames).toContain('default')
      expect(scenarioNames).toContain('empty')
      expect(scenarioNames).toContain('large-dataset')
    })

    it('should throw error for unknown scenario', () => {
      expect(() => {
        mockDataManager.switchScenario('unknown-scenario')
      }).toThrow('Unknown scenario: unknown-scenario')
    })

    it('should reset to default scenario', () => {
      mockDataManager.switchScenario('empty')
      mockDataManager.reset()
      expect(mockDataManager.getCurrentScenario()).toBe('default')
    })
  })

  describe('Configuration', () => {
    it('should switch scenario with configuration', () => {
      const config = {
        openaiConfig: {
          model: 'gpt-3.5-turbo',
          responseDelay: 50,
        },
        errorRate: 0.1,
        responseDelay: 100,
      }

      expect(() => {
        mockDataManager.switchScenario('default', config)
      }).not.toThrow()
    })
  })

  describe('Statistics', () => {
    it('should get mock service statistics', async () => {
      const stats = await mockDataManager.getStats()

      expect(stats).toHaveProperty('currentScenario')
      expect(stats).toHaveProperty('ipcScenarios')
      expect(stats).toHaveProperty('databaseScenarios')
      expect(stats).toHaveProperty('openaiConfig')
      expect(stats).toHaveProperty('databaseStats')

      expect(stats.currentScenario).toBe('default')
      expect(Array.isArray(stats.ipcScenarios)).toBe(true)
      expect(Array.isArray(stats.databaseScenarios)).toBe(true)
    })
  })

  describe('Service Validation', () => {
    it('should validate all mock services', async () => {
      const validation = await mockDataManager.validateServices()

      expect(validation).toHaveProperty('ipc')
      expect(validation).toHaveProperty('openai')
      expect(validation).toHaveProperty('database')
      expect(validation).toHaveProperty('errors')

      expect(typeof validation.ipc).toBe('boolean')
      expect(typeof validation.openai).toBe('boolean')
      expect(typeof validation.database).toBe('boolean')
      expect(Array.isArray(validation.errors)).toBe(true)
    })
  })

  describe('Data Export', () => {
    it('should export mock data', async () => {
      const exportData = await mockDataManager.exportMockData()

      expect(exportData).toHaveProperty('scenario')
      expect(exportData).toHaveProperty('timestamp')
      expect(exportData).toHaveProperty('data')

      expect(exportData.scenario).toBe('default')
      expect(exportData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(exportData.data).toHaveProperty('stats')
      expect(exportData.data).toHaveProperty('scenarios')
    })
  })

  describe('Custom Scenarios', () => {
    it('should create custom scenario', () => {
      const customConfig = {
        ipcData: {},
        databaseData: {},
        openaiConfig: { model: 'custom-model' },
      }

      expect(() => {
        mockDataManager.createCustomScenario('custom-test', 'Custom test scenario', customConfig)
      }).not.toThrow()

      const scenarios = mockDataManager.getAvailableScenarios()
      const customScenario = scenarios.find(s => s.name === 'custom-test')

      expect(customScenario).toBeDefined()
      expect(customScenario?.description).toBe('Custom test scenario')
    })
  })

  describe('Error Simulation', () => {
    it('should simulate OpenAI errors', () => {
      expect(() => {
        mockDataManager.simulateError('openai', 'rate_limit')
      }).not.toThrow()
    })

    it('should simulate database errors', () => {
      expect(() => {
        mockDataManager.simulateError('database', 'connection_error')
      }).not.toThrow()
    })

    it('should simulate IPC errors', () => {
      expect(() => {
        mockDataManager.simulateError('ipc', 'timeout')
      }).not.toThrow()
    })
  })

  describe('Test Data Generation', () => {
    it('should generate small test data', () => {
      expect(() => {
        mockDataManager.generateTestData('small')
      }).not.toThrow()
    })

    it('should generate medium test data', () => {
      expect(() => {
        mockDataManager.generateTestData('medium')
      }).not.toThrow()
    })

    it('should generate large test data', () => {
      mockDataManager.generateTestData('large')
      expect(mockDataManager.getCurrentScenario()).toBe('large-dataset')
    })
  })

  describe('Logging', () => {
    it('should enable/disable logging', () => {
      expect(() => {
        mockDataManager.setLogging(false)
        mockDataManager.setLogging(true)
      }).not.toThrow()
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { MockManagerService } from '../mock-manager.service'

// Set NODE_ENV for testing
process.env.NODE_ENV = 'test'

describe('MockManagerService', () => {
  let mockManager: MockManagerService

  beforeEach(() => {
    mockManager = MockManagerService.getInstance()
  })

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = mockManager.getConfig()

      expect(config.enabled).toBe(true) // Should be true in development
      expect(config.autoInitialize).toBe(true)
      expect(config.developmentOnly).toBe(false)
      expect(config.globalErrorRate).toBeGreaterThanOrEqual(0)
      expect(config.globalDelayMultiplier).toBe(1.0)
      expect(config.services).toBeDefined()
      expect(config.services.mock).toBeDefined()
      expect(config.services.openai).toBeDefined()
      expect(config.services.ipc).toBeDefined()
    })

    it('should update configuration', async () => {
      const updates = {
        globalErrorRate: 0.1,
        globalDelayMultiplier: 2.0,
        services: {
          mock: { scenario: 'large' },
          openai: { enabled: false }
        }
      }

      await mockManager.updateConfig(updates)
      const config = mockManager.getConfig()

      expect(config.globalErrorRate).toBe(0.1)
      expect(config.globalDelayMultiplier).toBe(2.0)
      expect(config.services.mock.scenario).toBe('large')
      expect(config.services.openai.enabled).toBe(false)
    })
  })

  describe('Status and Health', () => {
    it('should provide status information', () => {
      const status = mockManager.getStatus()

      expect(status).toHaveProperty('enabled')
      expect(status).toHaveProperty('initialized')
      expect(status).toHaveProperty('currentScenario')
      expect(status).toHaveProperty('services')
      expect(status).toHaveProperty('statistics')

      expect(status.services).toHaveProperty('mock')
      expect(status.services).toHaveProperty('openai')
      expect(status.services).toHaveProperty('ipc')

      expect(status.statistics).toHaveProperty('totalRequests')
      expect(status.statistics).toHaveProperty('totalErrors')
      expect(status.statistics).toHaveProperty('averageDelay')
      expect(status.statistics).toHaveProperty('uptime')

      expect(typeof status.statistics.uptime).toBe('number')
      expect(status.statistics.uptime).toBeGreaterThanOrEqual(0)
    })

    it('should run health check', async () => {
      const health = await mockManager.runHealthCheck()

      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('services')
      expect(health).toHaveProperty('timestamp')

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status)
      expect(health.services).toHaveProperty('mock')
      expect(health.services).toHaveProperty('openai')
      expect(health.services).toHaveProperty('ipc')

      expect(typeof health.timestamp).toBe('string')
      expect(new Date(health.timestamp).getTime()).toBeGreaterThan(0)
    })
  })

  describe('Scenario Management', () => {
    it('should get current scenario', () => {
      const scenario = mockManager.getCurrentScenario()

      expect(scenario).toHaveProperty('id')
      expect(scenario).toHaveProperty('name')
      expect(scenario).toHaveProperty('description')
      expect(scenario).toHaveProperty('data')

      expect(typeof scenario.id).toBe('string')
      expect(typeof scenario.name).toBe('string')
      expect(typeof scenario.description).toBe('string')
      expect(scenario.data).toHaveProperty('projects')
      expect(scenario.data).toHaveProperty('conversations')
      expect(scenario.data).toHaveProperty('messages')
    })

    it('should list available scenarios', () => {
      const scenarios = mockManager.getAvailableScenarios()

      expect(Array.isArray(scenarios)).toBe(true)
      expect(scenarios.length).toBeGreaterThan(0)

      const scenarioIds = scenarios.map((s) => s.id)
      expect(scenarioIds).toContain('default')
      expect(scenarioIds).toContain('empty')
      expect(scenarioIds).toContain('large')
      expect(scenarioIds).toContain('error')

      scenarios.forEach((scenario) => {
        expect(scenario).toHaveProperty('id')
        expect(scenario).toHaveProperty('name')
        expect(scenario).toHaveProperty('description')
        expect(scenario).toHaveProperty('data')
      })
    })

    it('should switch scenarios', async () => {
      const originalScenario = mockManager.getCurrentScenario()
      const targetScenario = originalScenario.id === 'default' ? 'empty' : 'default'

      const success = await mockManager.switchScenario(targetScenario)
      expect(success).toBe(true)

      const newScenario = mockManager.getCurrentScenario()
      expect(newScenario.id).toBe(targetScenario)
      expect(newScenario.id).not.toBe(originalScenario.id)
    })

    it('should fail to switch to non-existent scenario', async () => {
      const success = await mockManager.switchScenario('non-existent-scenario')
      expect(success).toBe(false)
    })
  })

  describe('Error Simulation', () => {
    it('should simulate random errors', async () => {
      const error = await mockManager.simulateError()

      expect(error).toHaveProperty('code')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('details')

      expect(typeof error.code).toBe('string')
      expect(typeof error.message).toBe('string')
      expect(error.details).toHaveProperty('mockError', true)
      expect(error.details).toHaveProperty('timestamp')
    })

    it('should simulate specific error types', async () => {
      const errorType = 'DB_CONNECTION_ERROR'
      const error = await mockManager.simulateError(errorType)

      expect(error.code).toBe(errorType)
      expect(typeof error.message).toBe('string')
    })
  })

  describe('Statistics Management', () => {
    it('should reset statistics', async () => {
      // First, simulate some activity
      await mockManager.simulateError()
      await mockManager.simulateError()

      // Reset statistics
      await mockManager.resetStatistics()

      const newStatus = mockManager.getStatus()
      expect(newStatus.statistics.totalRequests).toBe(0)
      expect(newStatus.statistics.totalErrors).toBe(0)
      expect(newStatus.statistics.averageDelay).toBe(0)

      // Uptime should be reset (close to 0)
      expect(newStatus.statistics.uptime).toBeLessThan(1000) // Less than 1 second
    })
  })

  describe('Command Execution', () => {
    it('should execute status command', async () => {
      const result = await mockManager.executeCommand('status')

      expect(result).toHaveProperty('enabled')
      expect(result).toHaveProperty('initialized')
      expect(result).toHaveProperty('currentScenario')
      expect(result).toHaveProperty('services')
      expect(result).toHaveProperty('statistics')
    })

    it('should execute health command', async () => {
      const result = await mockManager.executeCommand('health')

      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('services')
      expect(result).toHaveProperty('timestamp')
    })

    it('should execute list-scenarios command', async () => {
      const result = await mockManager.executeCommand('list-scenarios')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      result.forEach((scenario: { id: string; name: string; description: string }) => {
        expect(scenario).toHaveProperty('id')
        expect(scenario).toHaveProperty('name')
        expect(scenario).toHaveProperty('description')
      })
    })

    it('should execute switch-scenario command', async () => {
      const result = await mockManager.executeCommand('switch-scenario', ['empty'])
      expect(result).toBe(true)

      const currentScenario = mockManager.getCurrentScenario()
      expect(currentScenario.id).toBe('empty')
    })

    it('should execute simulate-error command', async () => {
      const result = await mockManager.executeCommand('simulate-error', ['TIMEOUT'])

      expect(result).toHaveProperty('code', 'TIMEOUT')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('details')
    })

    it('should execute reset-stats command', async () => {
      const result = await mockManager.executeCommand('reset-stats')
      expect(result).toHaveProperty('success', true)
    })

    it('should handle unknown commands', async () => {
      await expect(mockManager.executeCommand('unknown-command')).rejects.toThrow(
        'Unknown command: unknown-command'
      )
    })
  })

  describe('Service Control', () => {
    it('should disable mocks', async () => {
      // Test disable
      await mockManager.disableMocks()
      expect(mockManager.isEnabled()).toBe(false)
    })

    it('should handle enable/disable through configuration', async () => {
      await mockManager.updateConfig({ enabled: false })
      expect(mockManager.isEnabled()).toBe(false)

      await mockManager.updateConfig({ enabled: true })
      expect(mockManager.isEnabled()).toBe(true)
    })
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      // The service should already be initialized from getInstance()
      expect(mockManager.isEnabled()).toBe(true)

      // Test re-initialization (should not throw)
      await expect(mockManager.initialize()).resolves.not.toThrow()
    })
  })
})

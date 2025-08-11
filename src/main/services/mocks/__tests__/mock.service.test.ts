import { describe, it, expect, beforeEach } from 'vitest'
import { MockService } from '../mock.service'

describe('MockService', () => {
  let mockService: MockService

  beforeEach(() => {
    mockService = MockService.getInstance()
  })

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = mockService.getConfig()

      expect(config.enabled).toBe(true)
      expect(config.scenario).toBe('default')
      expect(config.delays).toBeDefined()
      expect(config.errorRate).toBeGreaterThanOrEqual(0)
      expect(config.errorRate).toBeLessThanOrEqual(1)
    })

    it('should update configuration', () => {
      const updates = {
        errorRate: 0.1,
        delays: { short: 100, medium: 500, long: 1000 }
      }

      mockService.updateConfig(updates)
      const config = mockService.getConfig()

      expect(config.errorRate).toBe(0.1)
      expect(config.delays.short).toBe(100)
      expect(config.delays.medium).toBe(500)
      expect(config.delays.long).toBe(1000)
    })
  })

  describe('Scenario Management', () => {
    it('should have default scenario', () => {
      const scenario = mockService.getCurrentScenario()

      expect(scenario).toBeDefined()
      expect(scenario.id).toBe('default')
      expect(scenario.name).toBe('Default Scenario')
      expect(scenario.data).toBeDefined()
    })

    it('should list available scenarios', () => {
      const scenarios = mockService.getAvailableScenarios()

      expect(scenarios).toBeInstanceOf(Array)
      expect(scenarios.length).toBeGreaterThan(0)

      const scenarioIds = scenarios.map((s) => s.id)
      expect(scenarioIds).toContain('default')
      expect(scenarioIds).toContain('empty')
      expect(scenarioIds).toContain('large')
      expect(scenarioIds).toContain('error')
    })

    it('should switch scenarios', () => {
      const success = mockService.switchScenario('empty')
      expect(success).toBe(true)

      const currentScenario = mockService.getCurrentScenario()
      expect(currentScenario.id).toBe('empty')
    })

    it('should fail to switch to non-existent scenario', () => {
      const success = mockService.switchScenario('non-existent')
      expect(success).toBe(false)

      // Should remain on current scenario
      const currentScenario = mockService.getCurrentScenario()
      expect(currentScenario.id).not.toBe('non-existent')
    })
  })

  describe('Data Access', () => {
    beforeEach(() => {
      // Switch to default scenario for consistent data
      mockService.switchScenario('default')
    })

    it('should provide projects data', () => {
      const projects = mockService.getProjects()

      expect(projects).toBeInstanceOf(Array)
      expect(projects.length).toBeGreaterThan(0)

      const project = projects[0]
      expect(project).toHaveProperty('id')
      expect(project).toHaveProperty('name')
      expect(project).toHaveProperty('created_at')
      expect(project).toHaveProperty('updated_at')
    })

    it('should provide conversations data', () => {
      const conversations = mockService.getConversations()

      expect(conversations).toBeInstanceOf(Array)
      expect(conversations.length).toBeGreaterThan(0)

      const conversation = conversations[0]
      expect(conversation).toHaveProperty('id')
      expect(conversation).toHaveProperty('title')
      expect(conversation).toHaveProperty('created_at')
      expect(conversation).toHaveProperty('updated_at')
    })

    it('should filter conversations by project', () => {
      const projects = mockService.getProjects()
      const projectId = projects[0].id

      const allConversations = mockService.getConversations()
      const projectConversations = mockService.getConversations(projectId)

      expect(projectConversations.length).toBeLessThanOrEqual(allConversations.length)

      projectConversations.forEach((conv) => {
        expect(conv.project_id).toBe(projectId)
      })
    })

    it('should provide messages for conversation', () => {
      const conversations = mockService.getConversations()
      const conversationId = conversations[0].id

      const messages = mockService.getMessages(conversationId)

      expect(messages).toBeInstanceOf(Array)

      messages.forEach((message) => {
        expect(message.conversation_id).toBe(conversationId)
        expect(message).toHaveProperty('role')
        expect(['user', 'assistant', 'system']).toContain(message.role)
        expect(message).toHaveProperty('content')
      })
    })
  })

  describe('Statistics Generation', () => {
    it('should generate database stats', () => {
      const stats = mockService.generateDatabaseStats()

      expect(stats).toHaveProperty('totalProjects')
      expect(stats).toHaveProperty('totalConversations')
      expect(stats).toHaveProperty('totalMessages')
      expect(stats).toHaveProperty('totalFiles')
      expect(stats).toHaveProperty('totalChunks')
      expect(stats).toHaveProperty('databaseSize')
      expect(stats).toHaveProperty('indexHealth')

      expect(typeof stats.totalProjects).toBe('number')
      expect(typeof stats.databaseSize).toBe('number')
      expect(stats.indexHealth).toHaveProperty('vectorIndex')
      expect(stats.indexHealth).toHaveProperty('ftsIndex')
    })

    it('should generate system info', () => {
      const info = mockService.generateSystemInfo()

      expect(info).toHaveProperty('name')
      expect(info).toHaveProperty('version')
      expect(info).toHaveProperty('platform')
      expect(info).toHaveProperty('arch')
      expect(info).toHaveProperty('uptime')
      expect(info).toHaveProperty('memoryUsage')
      expect(info).toHaveProperty('storageUsage')

      expect(typeof info.uptime).toBe('number')
      expect(info.memoryUsage).toHaveProperty('used')
      expect(info.memoryUsage).toHaveProperty('total')
      expect(info.storageUsage).toHaveProperty('used')
      expect(info.storageUsage).toHaveProperty('total')
    })

    it('should generate project stats', () => {
      const projects = mockService.getProjects()
      const projectId = projects[0].id

      const stats = mockService.generateProjectStats(projectId)

      expect(stats).toHaveProperty('conversationCount')
      expect(stats).toHaveProperty('fileCount')
      expect(stats).toHaveProperty('memoryCount')
      expect(stats).toHaveProperty('knowledgeCount')
      expect(stats).toHaveProperty('totalSize')

      expect(typeof stats.conversationCount).toBe('number')
      expect(typeof stats.fileCount).toBe('number')
      expect(typeof stats.totalSize).toBe('number')
    })
  })

  describe('Search Simulation', () => {
    beforeEach(() => {
      mockService.switchScenario('default')
    })

    it('should simulate search with results', () => {
      const results = mockService.simulateSearch('vector', 5)

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeLessThanOrEqual(5)

      if (results.length > 0) {
        const result = results[0]
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('type')
        expect(result).toHaveProperty('title')
        expect(result).toHaveProperty('content')
        expect(result).toHaveProperty('highlight')
        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('timestamp')

        expect(['conversation', 'message', 'file', 'knowledge']).toContain(result.type)
        expect(typeof result.score).toBe('number')
      }
    })

    it('should return empty results for non-matching query', () => {
      const results = mockService.simulateSearch('xyznonexistentquery123', 10)

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBe(0)
    })
  })

  describe('RAG Search Simulation', () => {
    it('should simulate RAG search', () => {
      const queryEmbedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1)
      const results = mockService.simulateRAGSearch(queryEmbedding, undefined, 5)

      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeLessThanOrEqual(5)

      if (results.length > 0) {
        const result = results[0]
        expect(result).toHaveProperty('content')
        expect(result).toHaveProperty('filename')
        expect(result).toHaveProperty('score')
        expect(result).toHaveProperty('chunk_index')
        expect(result).toHaveProperty('fileId')
        expect(result).toHaveProperty('projectId')

        expect(typeof result.score).toBe('number')
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(1)
      }
    })

    it('should filter RAG search by project', () => {
      const projects = mockService.getProjects()
      const projectId = projects[0].id

      const queryEmbedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1)
      const results = mockService.simulateRAGSearch(queryEmbedding, projectId, 10)

      results.forEach((result) => {
        expect(result.projectId).toBe(projectId)
      })
    })
  })

  describe('Error Simulation', () => {
    it('should generate mock errors', () => {
      const error = mockService.generateMockError()

      expect(error).toHaveProperty('code')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('details')

      expect(typeof error.code).toBe('string')
      expect(typeof error.message).toBe('string')
      expect(error.details).toHaveProperty('mockError', true)
    })

    it('should generate specific error types', () => {
      const code = 'TEST_ERROR'
      const message = 'Test error message'

      const error = mockService.generateMockError(code, message)

      expect(error.code).toBe(code)
      expect(error.message).toBe(message)
    })

    it('should respect error rate configuration', () => {
      // Set high error rate
      mockService.updateConfig({ errorRate: 1.0 })

      let errorCount = 0
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        if (mockService.shouldSimulateError()) {
          errorCount++
        }
      }

      // Should have high error rate
      expect(errorCount).toBeGreaterThan(iterations * 0.8)

      // Reset to low error rate
      mockService.updateConfig({ errorRate: 0.0 })

      errorCount = 0
      for (let i = 0; i < iterations; i++) {
        if (mockService.shouldSimulateError()) {
          errorCount++
        }
      }

      // Should have low error rate
      expect(errorCount).toBeLessThan(iterations * 0.2)
    })
  })

  describe('Delay Simulation', () => {
    it('should simulate delays', async () => {
      const startTime = Date.now()

      await mockService.simulateDelay('short')

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should take some time (at least 50ms, less than 1000ms)
      expect(duration).toBeGreaterThan(50)
      expect(duration).toBeLessThan(1000)
    })

    it('should respect delay configuration', async () => {
      mockService.updateConfig({
        delays: { short: 100, medium: 200, long: 300 }
      })

      const startTime = Date.now()
      await mockService.simulateDelay('short')
      const shortDuration = Date.now() - startTime

      const mediumStart = Date.now()
      await mockService.simulateDelay('medium')
      const mediumDuration = Date.now() - mediumStart

      // Medium should generally take longer than short
      // (allowing for some variation)
      expect(mediumDuration).toBeGreaterThan(shortDuration * 0.8)
    })
  })
})

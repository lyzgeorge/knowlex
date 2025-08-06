/**
 * IPC Mock Service Tests
 */

import { ipcMockService } from '../ipc.mock'
import { IPC_CHANNELS } from '@knowlex/types'

describe('IPCMockService', () => {
  beforeEach(() => {
    ipcMockService.switchScenario('default')
  })

  describe('Project Operations', () => {
    it('should list projects', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_LIST, undefined)

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeGreaterThan(0)
    })

    it('should get a specific project', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_GET, { id: 1 })

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.id).toBe(1)
    })

    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project',
      }

      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_CREATE, projectData)

      expect(response.success).toBe(true)
      expect(response.data.name).toBe(projectData.name)
      expect(response.data.description).toBe(projectData.description)
      expect(response.data.id).toBeDefined()
    })

    it('should update an existing project', async () => {
      const updateData = {
        id: 1,
        name: 'Updated Project Name',
      }

      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_UPDATE, updateData)

      expect(response.success).toBe(true)
      expect(response.data.name).toBe(updateData.name)
    })

    it('should delete a project', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_DELETE, { id: 1 })

      expect(response.success).toBe(true)
    })

    it('should handle project not found', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_GET, { id: 999 })

      expect(response.success).toBe(true)
      expect(response.data).toBeNull()
    })
  })

  describe('Conversation Operations', () => {
    it('should list conversations', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.CONVERSATION_LIST, {})

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('should filter conversations by project', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.CONVERSATION_LIST, { projectId: 1 })

      expect(response.success).toBe(true)
      expect(Array.isArray(response.data)).toBe(true)
      response.data.forEach((conv: any) => {
        expect(conv.projectId).toBe(1)
      })
    })

    it('should get conversation with messages', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.CONVERSATION_GET, { id: 'conv-1' })

      expect(response.success).toBe(true)
      expect(response.data.conversation).toBeDefined()
      expect(response.data.messages).toBeDefined()
      expect(Array.isArray(response.data.messages)).toBe(true)
    })
  })

  describe('Settings Operations', () => {
    it('should get settings', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.SETTINGS_GET, {})

      expect(response.success).toBe(true)
      expect(response.data).toBeDefined()
      expect(response.data.chatApi).toBeDefined()
      expect(response.data.embeddingApi).toBeDefined()
    })

    it('should update settings', async () => {
      const newSettings = {
        settings: {
          theme: 'dark' as const,
          language: 'zh' as const,
        },
      }

      const response = await ipcMockService.invoke(IPC_CHANNELS.SETTINGS_SET, newSettings)

      expect(response.success).toBe(true)
    })

    it('should test API configuration', async () => {
      const testRequest = {
        type: 'chat' as const,
        config: {
          apiKey: 'test-key',
          baseUrl: 'https://api.test.com',
          model: 'gpt-4',
        },
      }

      const response = await ipcMockService.invoke(IPC_CHANNELS.SETTINGS_TEST_API, testRequest)

      expect(response.success).toBe(true)
      expect(response.data.success).toBeDefined()
      expect(response.data.latency).toBeDefined()
    })
  })

  describe('Scenario Switching', () => {
    it('should switch to empty scenario', () => {
      ipcMockService.switchScenario('empty')
      expect(ipcMockService.getCurrentScenario()).toBe('empty')
    })

    it('should switch to large dataset scenario', () => {
      ipcMockService.switchScenario('large-dataset')
      expect(ipcMockService.getCurrentScenario()).toBe('large-dataset')
    })

    it('should handle invalid scenario gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      ipcMockService.switchScenario('invalid-scenario')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scenario not found: invalid-scenario')
      )

      consoleSpy.mockRestore()
    })

    it('should list available scenarios', () => {
      const scenarios = ipcMockService.getAvailableScenarios()

      expect(Array.isArray(scenarios)).toBe(true)
      expect(scenarios).toContain('default')
      expect(scenarios).toContain('empty')
      expect(scenarios).toContain('large-dataset')
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock an error by using an invalid channel
      const response = await ipcMockService.invoke('invalid-channel' as any, {})

      expect(response.success).toBe(false)
      expect(response.error).toBeDefined()
      expect(response.error.code).toBe('MOCK_ERROR')
    })
  })

  describe('Response Format', () => {
    it('should return properly formatted success response', async () => {
      const response = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_LIST, undefined)

      expect(response).toHaveProperty('id')
      expect(response).toHaveProperty('success', true)
      expect(response).toHaveProperty('data')
      expect(response).toHaveProperty('timestamp')
      expect(response).toHaveProperty('version')
    })

    it('should return properly formatted error response', async () => {
      const response = await ipcMockService.invoke('invalid-channel' as any, {})

      expect(response).toHaveProperty('id')
      expect(response).toHaveProperty('success', false)
      expect(response).toHaveProperty('error')
      expect(response).toHaveProperty('timestamp')
      expect(response.error).toHaveProperty('code')
      expect(response.error).toHaveProperty('message')
    })
  })
})

/**
 * IPC Mock Service
 *
 * Provides mock implementations for IPC communication during development and testing.
 * Automatically generates mock data based on @knowlex/types definitions.
 */

import {
  IPC_CHANNELS,
  IPCResponse,
  IPCChannelMap,
  Project,
  Conversation,
  Message,
  ProjectFile,
  ProjectMemory,
  ProjectKnowledge,
  AppSettings,
  SearchResult,
  SystemInfo,
  TestAPIResponse,
  StreamResponseChunk,
} from '@knowlex/types'

export interface MockScenario {
  name: string
  description: string
  data: {
    projects: Project[]
    conversations: Conversation[]
    messages: Message[]
    files: ProjectFile[]
    memories: ProjectMemory[]
    knowledge: ProjectKnowledge[]
    settings: AppSettings
  }
}

export class IPCMockService {
  private currentScenario: MockScenario
  private streamingResponses = new Map<string, NodeJS.Timeout>()

  constructor() {
    this.currentScenario = this.getDefaultScenario()
  }

  /**
   * Switch to a different test scenario
   */
  switchScenario(scenarioName: string): void {
    const scenario = this.getScenario(scenarioName)
    if (scenario) {
      this.currentScenario = scenario
      // [IPC Mock] Switched to scenario: ${scenarioName}
    } else {
      console.warn(`[IPC Mock] Scenario not found: ${scenarioName}`)
    }
  }

  /**
   * Get current scenario name
   */
  getCurrentScenario(): string {
    return this.currentScenario.name
  }

  /**
   * Get available test scenarios
   */
  getAvailableScenarios(): string[] {
    return ['default', 'empty', 'large-dataset', 'error-prone']
  }

  /**
   * Mock IPC invoke method
   */
  async invoke<T extends keyof IPCChannelMap>(
    channel: T,
    data: IPCChannelMap[T]['request']
  ): Promise<IPCChannelMap[T]['response']> {
    // [IPC Mock] Invoke: ${channel}, data

    // Simulate network delay
    await this.delay(100 + Math.random() * 200)

    try {
      const response = await this.handleChannel(channel, data)
      return this.createSuccessResponse(response)
    } catch (error) {
      return this.createErrorResponse(error as Error)
    }
  }

  /**
   * Mock IPC send method for streaming responses
   */
  send(channel: string, data: unknown): void {
    // [IPC Mock] Send: ${channel}, data

    if (channel === IPC_CHANNELS.CHAT_SEND_MESSAGE) {
      this.simulateStreamingResponse(data as any)
    }
  }

  /**
   * Mock IPC on method for event listeners
   */
  on(channel: string, _callback: (data: unknown) => void): void {
    console.log(`[IPC Mock] Registered listener for: ${channel}`)
    // Store callback for later use in streaming responses
  }

  private async handleChannel(channel: string, data: unknown): Promise<unknown> {
    switch (channel) {
      // Project channels
      case IPC_CHANNELS.PROJECT_LIST:
        return this.currentScenario.data.projects

      case IPC_CHANNELS.PROJECT_GET:
        return this.currentScenario.data.projects.find(p => p.id === (data as any).id) || null

      case IPC_CHANNELS.PROJECT_CREATE: {
        const newProject: Project = {
          id: Date.now(),
          name: (data as any).name,
          description: (data as any).description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        this.currentScenario.data.projects.push(newProject)
        return newProject
      }

      case IPC_CHANNELS.PROJECT_UPDATE: {
        const projectIndex = this.currentScenario.data.projects.findIndex(p => p.id === (data as any).id)
        if (projectIndex >= 0) {
          this.currentScenario.data.projects[projectIndex] = {
            ...this.currentScenario.data.projects[projectIndex],
            ...data,
            updatedAt: new Date().toISOString(),
          }
          return this.currentScenario.data.projects[projectIndex]
        }
        throw new Error('Project not found')
      }

      case IPC_CHANNELS.PROJECT_DELETE: {
        const deleteIndex = this.currentScenario.data.projects.findIndex(p => p.id === (data as any).id)
        if (deleteIndex >= 0) {
          this.currentScenario.data.projects.splice(deleteIndex, 1)
        const newProject: Project = {
          id: Date.now(),
          name: (data as any).name,
          description: (data as any).description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        this.currentScenario.data.projects.push(newProject)
        return newProject
      }

      case IPC_CHANNELS.CONVERSATION_GET: {
        const conversation = this.currentScenario.data.conversations.find(c => c.id === (data as any).id)
        const messages = this.currentScenario.data.messages.filter(
          m => m.conversationId === (data as any).id
        )
        return { conversation, messages }
      }

      // Chat channels
      case IPC_CHANNELS.CHAT_SEND_MESSAGE:
        const conversationId = (data as any).conversationId || `conv-${Date.now()}`
        const messageId = `msg-${Date.now()}`
        return { conversationId, messageId }

      case IPC_CHANNELS.CHAT_GENERATE_TITLE:
        return { title: `Generated title for conversation ${(data as any).conversationId}` }

      case IPC_CHANNELS.CHAT_GENERATE_SUMMARY:
        return { summary: 'This is a mock summary of the conversation...' }
          md5Original: file.md5,
          md5Pdf: 'mock-pdf-' + file.md5,
          status: 'processing' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        this.currentScenario.data.files.push(...uploadedFiles)

        // Simulate processing completion after delay
        setTimeout(() => {
          uploadedFiles.forEach((file: any) => {
            file.status = 'completed'
          })
        }, 2000)

        return uploadedFiles
      }

      // Memory channels
      case IPC_CHANNELS.MEMORY_LIST:
        return this.currentScenario.data.memories.filter(m => m.projectId === (data as any).projectId)

      case IPC_CHANNELS.MEMORY_CREATE: {
        const newMemory: ProjectMemory = {
          id: Date.now(),
          projectId: (data as any).projectId,
          content: (data as any).content,
          type: (data as any).type || 'memory',
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        this.currentScenario.data.memories.push(newMemory)
        const newMemory: ProjectMemory = {
          id: Date.now(),
          projectId: (data as any).projectId,
          content: (data as any).content,
          type: (data as any).type || 'memory',
          isSystem: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        this.currentScenario.data.memories.push(newMemory)
        return newMemory
          title: (data as any).title,
          content: (data as any).content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        this.currentScenario.data.knowledge.push(newKnowledge)
        const newKnowledge: ProjectKnowledge = {
          id: Date.now(),
          projectId: (data as any).projectId,
          title: (data as any).title,
          content: (data as any).content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        this.currentScenario.data.knowledge.push(newKnowledge)
        return newKnowledge
          ...(data as any).settings,
        }
        return null

      case IPC_CHANNELS.SETTINGS_TEST_API: {
        const testResponse: TestAPIResponse = {
          success: Math.random() > 0.2, // 80% success rate
          latency: 100 + Math.random() * 500,
          error: Math.random() > 0.8 ? 'Connection timeout' : undefined,
        }
        return testResponse
      }

      // Search channels
      case IPC_CHANNELS.SEARCH_FULLTEXT: {
        const searchResults: SearchResult[] = [
          {
            conversationId: 'conv-1',
            title: `Search result for "${data.query}"`,
            projectId: 1,
            projectName: 'Project A',
            snippet: `This is a mock search result containing ${data.query}...`,
            createdAt: new Date().toISOString(),
          },
        ]
        return {
          data: searchResults,
          total: searchResults.length,
          limit: (data as any).limit || 10,
          offset: (data as any).offset || 0,
          hasMore: false,
        }
      }

      // System channels
      case IPC_CHANNELS.SYSTEM_GET_INFO: {
        const systemInfo: SystemInfo = {
          platform: 'darwin',
          arch: 'x64',
          version: '14.0.0',
          appVersion: '0.1.0',
          dataPath: '/mock/data/path',
        }
        return systemInfo
      }
      }

      // Chat channels
      case IPC_CHANNELS.CHAT_SEND_MESSAGE: {
        const conversationId = (data as any).conversationId || `conv-${Date.now()}`
        const messageId = `msg-${Date.now()}`
        return { conversationId, messageId }
      }
      }

      case IPC_CHANNELS.CHAT_GENERATE_TITLE:
        return { title: `Generated title for conversation ${(data as any).conversationId}` }

      case IPC_CHANNELS.CHAT_GENERATE_SUMMARY:
        return { summary: 'This is a mock summary of the conversation...' }

      default:
        throw new Error(`Mock handler not implemented for channel: ${channel}`)
    }
  }

  private simulateStreamingResponse(data: unknown): void {
    const conversationId = (data as any).conversationId || `conv-${Date.now()}`
    const messageId = `msg-${Date.now()}`
    const mockResponse =
      'This is a mock streaming response from the AI assistant. It simulates how the real AI would respond with streaming text chunks.'

    const words = mockResponse.split(' ')
    let currentIndex = 0

    const streamInterval = setInterval(
      () => {
        if (currentIndex < words.length) {
          const chunk: StreamResponseChunk = {
            conversationId,
            messageId,
            content: words[currentIndex] + ' ',
            isComplete: false,
            sources:
              currentIndex === 0
                ? [
                    {
                      fileId: 1,
                      filename: 'mock-file.txt',
                      snippet: 'Mock file content snippet...',
                      score: 0.85,
                    },
                  ]
                : undefined,
          }

          // Simulate sending to renderer
          console.log('[IPC Mock] Stream chunk:', chunk)
          currentIndex++
        } else {
          // Send final chunk
          const finalChunk: StreamResponseChunk = {
            conversationId,
            messageId,
            content: '',
            isComplete: true,
          }
          console.log('[IPC Mock] Stream complete:', finalChunk)
          clearInterval(streamInterval)
        }
      },
      50 + Math.random() * 100
    ) // Variable delay to simulate real streaming

    this.streamingResponses.set(messageId, streamInterval)
  }

  private createSuccessResponse<T>(data: T): IPCResponse<T> {
    return {
      id: Date.now().toString(),
      success: true,
      data,
      timestamp: Date.now(),
    }
  }

  private createErrorResponse(error: Error): IPCResponse<undefined> {
    return {
      id: Date.now().toString(),
      success: false,
      error: {
        code: 'MOCK_ERROR',
        message: error.message,
        details: error.stack,
      },
      timestamp: Date.now(),
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getDefaultScenario(): MockScenario {
    return {
      name: 'default',
      description: 'Default mock scenario with sample data',
      data: {
        projects: [
          {
            id: 1,
            name: 'AI Research Project',
            description: 'Research on artificial intelligence and machine learning',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 2,
            name: 'Web Development',
            description: 'Frontend and backend development projects',
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ],
        conversations: [
          {
            id: 1,
            title: 'Introduction to AI',
            projectId: 1,
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 2,
            title: 'React Best Practices',
            projectId: 2,
            createdAt: '2024-01-02T10:00:00Z',
            updatedAt: '2024-01-02T10:00:00Z',
          },
        ],
        messages: [
          {
            id: 1,
            conversationId: 'conv-1',
            role: 'user',
            content: 'What is artificial intelligence?',
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:00:00Z',
          },
          {
            id: 2,
            conversationId: 'conv-1',
            role: 'assistant',
            content: 'Artificial intelligence (AI) is a branch of computer science...',
            createdAt: '2024-01-01T10:01:00Z',
            updatedAt: '2024-01-01T10:01:00Z',
          },
        ],
        files: [
          {
            id: 1,
            projectId: 1,
            filename: 'ai-research-paper.pdf',
            originalPath: '/mock/path/ai-research-paper.pdf',
            pdfPath: '/mock/path/ai-research-paper.pdf',
            fileSize: 1024000,
            md5Original: 'mock-md5-original',
            md5Pdf: 'mock-md5-pdf',
            status: 'completed',
            createdAt: '2024-01-01T09:00:00Z',
            updatedAt: '2024-01-01T09:00:00Z',
          },
        ],
        memories: [
          {
            id: 1,
            projectId: 1,
            content: 'This project focuses on machine learning algorithms',
            type: 'description',
            isSystem: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        knowledge: [
          {
            id: 1,
            projectId: 1,
            title: 'AI Fundamentals',
            content: '# AI Fundamentals\n\nKey concepts in artificial intelligence...',
            createdAt: '2024-01-01T08:00:00Z',
            updatedAt: '2024-01-01T08:00:00Z',
          },
        ],
        settings: {
          chatApi: {
            apiKey: 'mock-api-key',
            baseUrl: 'https://api.openai.com/v1',
            model: 'gpt-4',
          },
          embeddingApi: {
            apiKey: 'mock-embedding-key',
            baseUrl: 'https://api.openai.com/v1',
            model: 'text-embedding-ada-002',
          },
          theme: 'light',
          language: 'en',
          ragSettings: {
            enabled: true,
            topK: 5,
            threshold: 0.7,
          },
        },
      },
    }
  }

  private getScenario(name: string): MockScenario | null {
    switch (name) {
      case 'default':
        return this.getDefaultScenario()

      case 'empty':
        return {
          name: 'empty',
          description: 'Empty scenario with no data',
          data: {
            projects: [],
            conversations: [],
            messages: [],
            files: [],
            memories: [],
            knowledge: [],
            settings: this.getDefaultScenario().data.settings,
          },
        }

      case 'large-dataset':
        return this.generateLargeDatasetScenario()

      case 'error-prone':
        return this.getErrorProneScenario()

      default:
        return null
    }
  }

  private generateLargeDatasetScenario(): MockScenario {
    const projects: Project[] = []
    const conversations: Conversation[] = []
    const messages: Message[] = []

    // Generate 50 projects
    for (let i = 1; i <= 50; i++) {
      projects.push({
        id: i,
        name: `Project ${i}`,
        description: `Description for project ${i}`,
        createdAt: new Date(2024, 0, i).toISOString(),
        updatedAt: new Date(2024, 0, i).toISOString(),
      })

      // Generate 5 conversations per project
      for (let j = 1; j <= 5; j++) {
        const convId = i * 100 + j;
        conversations.push({
          id: convId,
          title: `Conversation ${j} in Project ${i}`,
          projectId: i,
          createdAt: new Date(2024, 0, i, j).toISOString(),
          updatedAt: new Date(2024, 0, i, j).toISOString(),
        })

        // Generate 10 messages per conversation
        for (let k = 1; k <= 10; k++) {
          messages.push({
            id: i * 10000 + j * 100 + k,
            conversationId: `conv-${i}-${j}`,
            role: k % 2 === 1 ? 'user' : 'assistant',
            content: `Message ${k} in conversation ${j} of project ${i}`,
            createdAt: new Date(2024, 0, i, j, k).toISOString(),
            updatedAt: new Date(2024, 0, i, j, k).toISOString(),
          })
        }
      }
    }

    return {
      name: 'large-dataset',
      description: 'Large dataset scenario for performance testing',
      data: {
        projects,
        conversations,
        messages,
        files: [],
        memories: [],
        knowledge: [],
        settings: this.getDefaultScenario().data.settings,
      },
    }
  }

  private getErrorProneScenario(): MockScenario {
    const scenario = this.getDefaultScenario()
    scenario.name = 'error-prone'
    scenario.description = 'Scenario that simulates various error conditions'
    return scenario
  }
}

// Export singleton instance
export const ipcMockService = new IPCMockService()

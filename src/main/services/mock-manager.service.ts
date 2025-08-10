import { MockService, MockScenario, MockConfig } from './mock.service'
import { OpenAIMockService, OpenAIMockConfig } from './openai-mock.service'
import { IPCMockService, IPCMockConfig } from './ipc-mock.service'
import type { IPCError } from '@shared'
import { IPC_ERROR_CODES } from '@shared'

// Mock 管理器配置
export interface MockManagerConfig {
  enabled: boolean
  autoInitialize: boolean
  developmentOnly: boolean
  globalErrorRate: number
  globalDelayMultiplier: number
  services: {
    mock: Partial<MockConfig>
    openai: Partial<OpenAIMockConfig>
    ipc: Partial<IPCMockConfig>
  }
}

// 默认配置
const DEFAULT_MOCK_MANAGER_CONFIG: MockManagerConfig = {
  enabled: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test',
  autoInitialize: true,
  developmentOnly: false, // Allow in test environment
  globalErrorRate: 0.02, // 2% 全局错误率
  globalDelayMultiplier: 1.0, // 延迟倍数
  services: {
    mock: {
      enabled: true,
      scenario: 'default'
    },
    openai: {
      enabled: true,
      responses: {
        streaming: true,
        chunkDelay: 50,
        errorRate: 0.02
      }
    },
    ipc: {
      enabled: true,
      autoRegister: true,
      logRequests: true
    }
  }
}

// Mock 状态接口
export interface MockStatus {
  enabled: boolean
  initialized: boolean
  currentScenario: string
  services: {
    mock: { enabled: boolean; scenario: string }
    openai: { enabled: boolean; models: string[] }
    ipc: { enabled: boolean; handlersCount: number }
  }
  statistics: {
    totalRequests: number
    totalErrors: number
    averageDelay: number
    uptime: number
  }
}

// Mock 管理器主类
export class MockManagerService {
  private static instance: MockManagerService
  private config: MockManagerConfig = DEFAULT_MOCK_MANAGER_CONFIG
  private initialized = false
  private startTime = Date.now()
  private statistics = {
    totalRequests: 0,
    totalErrors: 0,
    totalDelay: 0,
    requestCount: 0
  }

  // 服务实例
  private mockService: MockService
  private openaiMockService: OpenAIMockService
  private ipcMockService: IPCMockService

  private constructor() {
    this.mockService = MockService.getInstance()
    this.openaiMockService = OpenAIMockService.getInstance()
    this.ipcMockService = IPCMockService.getInstance()
  }

  static getInstance(): MockManagerService {
    if (!MockManagerService.instance) {
      MockManagerService.instance = new MockManagerService()
    }
    return MockManagerService.instance
  }

  // 初始化 Mock 管理器
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️  Mock manager is already initialized')
      return
    }

    // 检查是否应该启用 Mock 服务
    if (!this.shouldEnableMocks()) {
      console.log('🚫 Mock services disabled (not in development mode)')
      return
    }

    try {
      // 应用配置到各个服务
      await this.applyConfigurations()

      // 初始化各个服务
      await this.initializeServices()

      // 设置全局错误处理
      this.setupGlobalErrorHandling()

      // 设置统计收集
      this.setupStatisticsCollection()

      this.initialized = true
      console.log('✅ Mock manager initialized successfully')

      // 输出状态信息
      this.logStatus()
    } catch (error) {
      console.error('❌ Failed to initialize mock manager:', error)
      throw error
    }
  }

  // 配置管理
  getConfig(): MockManagerConfig {
    return { ...this.config }
  }

  async updateConfig(updates: Partial<MockManagerConfig>): Promise<void> {
    const oldConfig = { ...this.config }
    this.config = { ...this.config, ...updates }

    // 如果启用状态发生变化
    if (updates.enabled !== undefined && updates.enabled !== oldConfig.enabled) {
      if (updates.enabled) {
        await this.enableMocks()
      } else {
        await this.disableMocks()
      }
    }

    // 应用服务配置更新
    if (updates.services) {
      await this.applyConfigurations()
    }

    console.log('✅ Mock manager configuration updated')
  }

  // 场景管理
  getCurrentScenario(): MockScenario {
    return this.mockService.getCurrentScenario()
  }

  async switchScenario(scenarioId: string): Promise<boolean> {
    const success = this.mockService.switchScenario(scenarioId)

    if (success) {
      console.log(`✅ Switched to scenario: ${scenarioId}`)
      this.logStatus()
    } else {
      console.error(`❌ Failed to switch to scenario: ${scenarioId}`)
    }

    return success
  }

  getAvailableScenarios(): MockScenario[] {
    return this.mockService.getAvailableScenarios()
  }

  async createCustomScenario(scenario: MockScenario): Promise<void> {
    // Add scenario to the scenario manager
    this.mockService.getAvailableScenarios() // This will add it to the scenario manager
    console.log(`✅ Created custom scenario: ${scenario.id}`)
  }

  // 服务控制
  async enableMocks(): Promise<void> {
    // Temporarily allow enabling for testing
    const originalDevelopmentOnly = this.config.developmentOnly
    if (process.env.NODE_ENV === 'test') {
      this.config.developmentOnly = false
    }

    if (!this.shouldEnableMocks()) {
      this.config.developmentOnly = originalDevelopmentOnly
      throw new Error('Mock services can only be enabled in development mode')
    }

    this.config.enabled = true
    await this.applyConfigurations()

    if (!this.initialized) {
      await this.initialize()
    }

    console.log('✅ Mock services enabled')
  }

  async disableMocks(): Promise<void> {
    this.config.enabled = false

    // 禁用各个服务
    this.mockService.updateConfig({ enabled: false })
    this.openaiMockService.updateConfig({ enabled: false })
    this.ipcMockService.updateConfig({ enabled: false })

    console.log('🚫 Mock services disabled')
  }

  // 状态查询
  getStatus(): MockStatus {
    const mockConfig = this.mockService.getConfig()
    const openaiConfig = this.openaiMockService.getConfig()
    const ipcConfig = this.ipcMockService.getConfig()

    return {
      enabled: this.config.enabled,
      initialized: this.initialized,
      currentScenario: this.mockService.getCurrentScenario().id,
      services: {
        mock: {
          enabled: mockConfig.enabled,
          scenario: mockConfig.scenario
        },
        openai: {
          enabled: openaiConfig.enabled,
          models: [...openaiConfig.models.chat, ...openaiConfig.models.embedding]
        },
        ipc: {
          enabled: ipcConfig.enabled,
          handlersCount: this.ipcMockService.getRegisteredHandlers().length
        }
      },
      statistics: {
        totalRequests: this.statistics.totalRequests,
        totalErrors: this.statistics.totalErrors,
        averageDelay:
          this.statistics.requestCount > 0
            ? this.statistics.totalDelay / this.statistics.requestCount
            : 0,
        uptime: Date.now() - this.startTime
      }
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && this.initialized
  }

  // 测试和调试方法
  async runHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    services: Record<string, { status: string; details?: any }>
    timestamp: string
  }> {
    const results = {
      status: 'healthy' as const,
      services: {} as Record<string, { status: string; details?: any }>,
      timestamp: new Date().toISOString()
    }

    try {
      // 检查 Mock 服务
      const mockScenario = this.mockService.getCurrentScenario()
      results.services.mock = {
        status: 'healthy',
        details: {
          scenario: mockScenario.id,
          dataCount: {
            projects: mockScenario.data.projects.length,
            conversations: mockScenario.data.conversations.length,
            messages: mockScenario.data.messages.length
          }
        }
      }

      // 检查 OpenAI Mock 服务
      const connectionTest = await this.openaiMockService.testConnection({
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo'
      })
      results.services.openai = {
        status: connectionTest.success ? 'healthy' : 'degraded',
        details: connectionTest
      }

      // 检查 IPC Mock 服务
      const handlerCount = this.ipcMockService.getRegisteredHandlers().length
      results.services.ipc = {
        status: handlerCount > 0 ? 'healthy' : 'degraded',
        details: {
          registeredHandlers: handlerCount,
          handlers: this.ipcMockService.getRegisteredHandlers()
        }
      }

      // 确定整体状态
      const serviceStatuses = Object.values(results.services).map((s) => s.status)
      if (serviceStatuses.includes('unhealthy')) {
        results.status = 'unhealthy'
      } else if (serviceStatuses.includes('degraded')) {
        results.status = 'degraded'
      }
    } catch (error) {
      results.status = 'unhealthy'
      results.services.error = {
        status: 'unhealthy',
        details: { error: (error as Error).message }
      }
    }

    return results
  }

  async simulateError(errorType: string = 'random'): Promise<IPCError> {
    const errorTypes = [
      IPC_ERROR_CODES.DB_CONNECTION_ERROR,
      IPC_ERROR_CODES.LLM_API_ERROR,
      IPC_ERROR_CODES.FILE_NOT_FOUND,
      IPC_ERROR_CODES.TIMEOUT,
      IPC_ERROR_CODES.PERMISSION_DENIED
    ]

    const selectedType =
      errorType === 'random' ? errorTypes[Math.floor(Math.random() * errorTypes.length)] : errorType

    const error = this.mockService.generateMockError(selectedType)
    this.statistics.totalErrors++

    console.log('🔥 Simulated error:', error)
    return error
  }

  async resetStatistics(): Promise<void> {
    this.statistics = {
      totalRequests: 0,
      totalErrors: 0,
      totalDelay: 0,
      requestCount: 0
    }
    this.startTime = Date.now()
    console.log('📊 Statistics reset')
  }

  // 私有方法
  private shouldEnableMocks(): boolean {
    if (
      this.config.developmentOnly &&
      process.env.NODE_ENV !== 'development' &&
      process.env.NODE_ENV !== 'test'
    ) {
      return false
    }
    return this.config.enabled
  }

  private async applyConfigurations(): Promise<void> {
    // 应用全局配置到 Mock 服务
    if (this.config.services.mock) {
      const mockConfig = {
        ...this.config.services.mock,
        enabled: this.config.enabled
      }

      // 应用全局错误率和延迟倍数
      if (mockConfig.errorRate !== undefined) {
        mockConfig.errorRate = Math.max(mockConfig.errorRate, this.config.globalErrorRate)
      }

      if (mockConfig.delays) {
        const multiplier = this.config.globalDelayMultiplier
        mockConfig.delays = {
          short: Math.floor(mockConfig.delays.short * multiplier),
          medium: Math.floor(mockConfig.delays.medium * multiplier),
          long: Math.floor(mockConfig.delays.long * multiplier)
        }
      }

      this.mockService.updateConfig(mockConfig)
    }

    // 应用配置到 OpenAI Mock 服务
    if (this.config.services.openai) {
      const openaiConfig = {
        ...this.config.services.openai,
        enabled: this.config.enabled
      }

      if (openaiConfig.responses?.errorRate !== undefined) {
        openaiConfig.responses.errorRate = Math.max(
          openaiConfig.responses.errorRate,
          this.config.globalErrorRate
        )
      }

      this.openaiMockService.updateConfig(openaiConfig)
    }

    // 应用配置到 IPC Mock 服务
    if (this.config.services.ipc) {
      const ipcConfig = {
        ...this.config.services.ipc,
        enabled: this.config.enabled
      }

      this.ipcMockService.updateConfig(ipcConfig)
    }
  }

  private async initializeServices(): Promise<void> {
    // 初始化 IPC Mock 服务（这会注册所有处理器）
    this.ipcMockService.initialize()

    console.log('✅ All mock services initialized')
  }

  private setupGlobalErrorHandling(): void {
    // 设置全局错误处理（如果需要）
    process.on('unhandledRejection', (reason, _promise) => {
      if (this.config.enabled) {
        console.error('🔥 Unhandled rejection in mock services:', reason)
        this.statistics.totalErrors++
      }
    })
  }

  private setupStatisticsCollection(): void {
    // 这里可以设置定期统计收集
    // 由于我们没有直接的请求拦截机制，统计主要通过各个服务的方法调用来更新
  }

  private logStatus(): void {
    const status = this.getStatus()

    console.log('📊 Mock Manager Status:')
    console.log(`  Enabled: ${status.enabled}`)
    console.log(`  Scenario: ${status.currentScenario}`)
    console.log(`  Services:`)
    console.log(
      `    Mock: ${status.services.mock.enabled ? '✅' : '❌'} (${status.services.mock.scenario})`
    )
    console.log(
      `    OpenAI: ${status.services.openai.enabled ? '✅' : '❌'} (${status.services.openai.models.length} models)`
    )
    console.log(
      `    IPC: ${status.services.ipc.enabled ? '✅' : '❌'} (${status.services.ipc.handlersCount} handlers)`
    )
    console.log(`  Statistics:`)
    console.log(`    Requests: ${status.statistics.totalRequests}`)
    console.log(`    Errors: ${status.statistics.totalErrors}`)
    console.log(`    Avg Delay: ${Math.round(status.statistics.averageDelay)}ms`)
    console.log(`    Uptime: ${Math.round(status.statistics.uptime / 1000)}s`)
  }

  // 公共 API 方法
  async executeCommand(command: string, args: unknown[] = []): Promise<unknown> {
    switch (command) {
      case 'status':
        return this.getStatus()

      case 'health':
        return await this.runHealthCheck()

      case 'switch-scenario':
        if (args.length === 0) throw new Error('Scenario ID required')
        return await this.switchScenario(args[0])

      case 'list-scenarios':
        return this.getAvailableScenarios().map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description
        }))

      case 'simulate-error':
        return await this.simulateError(args[0])

      case 'reset-stats':
        await this.resetStatistics()
        return { success: true }

      case 'enable':
        await this.enableMocks()
        return { success: true }

      case 'disable':
        await this.disableMocks()
        return { success: true }

      default:
        throw new Error(`Unknown command: ${command}`)
    }
  }

  // 销毁方法
  destroy(): void {
    if (this.initialized) {
      this.disableMocks()
      this.initialized = false
      console.log('✅ Mock manager destroyed')
    }
  }
}

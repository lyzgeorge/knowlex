import { ipcMain, BrowserWindow } from 'electron'
import type {
  IPCRequest,
  IPCResponse,
  IPCStreamData,
  IPCEvent,
  IPCError,
  IPCHandler,
  IPCStreamHandler,
  IPCMiddleware,
  IPCConfig
} from '@shared'
import { IPC_CHANNELS, IPC_ERROR_CODES } from '@shared'

// IPC 请求上下文
export interface IPCContext {
  request: IPCRequest
  sender: Electron.WebContents
  timestamp: number
}

// IPC 路由器实现
class IPCRouter {
  private handlers = new Map<string, IPCHandler>()
  private streamHandlers = new Map<string, IPCStreamHandler>()
  private middleware: IPCMiddleware[] = []
  private config: IPCConfig

  constructor(config: IPCConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      validateRequests: true,
      enableLogging: true,
      ...config
    }
  }

  // 注册普通处理器
  handle<TRequest = any, TResponse = any>(
    channel: string,
    handler: IPCHandler<TRequest, TResponse>
  ): void {
    if (this.config.enableLogging) {
      console.log(`✓ Registering IPC handler for channel: ${channel}`)
    }
    this.handlers.set(channel, handler)
  }

  // 注册流式处理器
  handleStream<TRequest = any, TData = any>(
    channel: string,
    handler: IPCStreamHandler<TRequest, TData>
  ): void {
    if (this.config.enableLogging) {
      console.log(`✓ Registering IPC stream handler for channel: ${channel}`)
    }
    this.streamHandlers.set(channel, handler)
  }

  // 添加中间件
  use(middleware: IPCMiddleware): void {
    this.middleware.push(middleware)
  }

  // 处理普通请求
  async handleRequest(context: IPCContext): Promise<IPCResponse> {
    const { request } = context
    let modifiedRequest = request

    try {
      // 执行前置中间件
      for (const middleware of this.middleware) {
        if (middleware.before) {
          modifiedRequest = await middleware.before(modifiedRequest)
        }
      }

      // 验证请求
      if (this.config.validateRequests) {
        this.validateRequest(modifiedRequest)
      }

      // 查找处理器
      const handler = this.handlers.get(modifiedRequest.channel)
      if (!handler) {
        throw this.createError(
          IPC_ERROR_CODES.INVALID_CHANNEL,
          `No handler found for channel: ${modifiedRequest.channel}`
        )
      }

      // 验证请求数据（如果处理器提供了验证方法）
      if (handler.validate && !handler.validate(modifiedRequest.data)) {
        throw this.createError(
          IPC_ERROR_CODES.INVALID_DATA,
          `Invalid data for channel: ${modifiedRequest.channel}`
        )
      }

      // 执行处理器
      const result = await handler.handle(modifiedRequest.data)

      let response: IPCResponse = {
        id: modifiedRequest.id,
        success: true,
        data: result,
        timestamp: Date.now(),
        version: modifiedRequest.version
      }

      // 执行后置中间件
      for (const middleware of this.middleware) {
        if (middleware.after) {
          response = await middleware.after(response)
        }
      }

      return response
    } catch (error) {
      let errorResponse: IPCResponse = {
        id: modifiedRequest.id,
        success: false,
        error: this.normalizeError(error),
        timestamp: Date.now(),
        version: modifiedRequest.version
      }

      // 执行错误中间件
      for (const middleware of this.middleware) {
        if (middleware.error) {
          errorResponse = await middleware.error(error as Error, modifiedRequest)
        }
      }

      if (this.config.enableLogging) {
        console.error(`✗ IPC request failed for channel '${modifiedRequest.channel}':`, error)
      }

      return errorResponse
    }
  }

  // 处理流式请求
  async handleStreamRequest(
    context: IPCContext,
    emit: (channel: string, data: IPCStreamData) => void
  ): Promise<void> {
    const { request } = context

    try {
      // 验证请求
      if (this.config.validateRequests) {
        this.validateRequest(request)
      }

      // 查找流式处理器
      const handler = this.streamHandlers.get(request.channel)
      if (!handler) {
        throw this.createError(
          IPC_ERROR_CODES.INVALID_CHANNEL,
          `No stream handler found for channel: ${request.channel}`
        )
      }

      // 验证请求数据
      if (handler.validate && !handler.validate(request.data)) {
        throw this.createError(
          IPC_ERROR_CODES.INVALID_DATA,
          `Invalid data for stream channel: ${request.channel}`
        )
      }

      const streamChannel = `stream-${request.channel}`

      // 发送开始事件
      emit(streamChannel, {
        id: request.id,
        channel: request.channel,
        type: 'start',
        timestamp: Date.now()
      })

      // 执行流式处理器
      await handler.handle(
        request.data,
        // emit 函数
        (data) => {
          emit(streamChannel, {
            id: request.id,
            channel: request.channel,
            type: 'data',
            data,
            timestamp: Date.now()
          })
        },
        // complete 函数
        () => {
          emit(streamChannel, {
            id: request.id,
            channel: request.channel,
            type: 'end',
            timestamp: Date.now()
          })
        },
        // error 函数
        (error) => {
          emit(streamChannel, {
            id: request.id,
            channel: request.channel,
            type: 'error',
            error: this.normalizeError(error),
            timestamp: Date.now()
          })
        }
      )
    } catch (error) {
      const streamChannel = `stream-${request.channel}`
      emit(streamChannel, {
        id: request.id,
        channel: request.channel,
        type: 'error',
        error: this.normalizeError(error),
        timestamp: Date.now()
      })

      if (this.config.enableLogging) {
        console.error(`✗ IPC stream request failed for channel '${request.channel}':`, error)
      }
    }
  }

  private validateRequest(request: IPCRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw this.createError(IPC_ERROR_CODES.INVALID_REQUEST, 'Invalid request ID')
    }

    if (!request.channel || typeof request.channel !== 'string') {
      throw this.createError(IPC_ERROR_CODES.INVALID_CHANNEL, 'Invalid channel')
    }

    if (!request.timestamp || typeof request.timestamp !== 'number') {
      throw this.createError(IPC_ERROR_CODES.INVALID_REQUEST, 'Invalid timestamp')
    }

    // 验证时间戳合理性（不能太旧或太新）
    const now = Date.now()
    const timeDiff = Math.abs(now - request.timestamp)
    if (timeDiff > 60000) {
      // 1分钟
      throw this.createError(
        IPC_ERROR_CODES.INVALID_REQUEST,
        'Request timestamp is too old or too new'
      )
    }
  }

  private createError(code: string, message: string, details?: any): IPCError {
    return { code, message, details }
  }

  private normalizeError(error: any): IPCError {
    if (error && typeof error === 'object' && error.code && error.message) {
      return error as IPCError
    }

    if (error instanceof Error) {
      return {
        code: IPC_ERROR_CODES.UNKNOWN_ERROR,
        message: error.message,
        details: { name: error.name, stack: error.stack }
      }
    }

    return {
      code: IPC_ERROR_CODES.UNKNOWN_ERROR,
      message: String(error)
    }
  }
}

// IPC 服务主类
export class IPCService {
  private static instance: IPCService
  private router: IPCRouter
  private initialized = false

  private constructor() {
    this.router = new IPCRouter({
      timeout: 30000,
      retries: 3,
      validateRequests: true,
      enableLogging: true
    })
  }

  static getInstance(): IPCService {
    if (!this.instance) {
      this.instance = new IPCService()
    }
    return this.instance
  }

  // 初始化 IPC 服务
  initialize(): void {
    if (this.initialized) {
      console.warn('⚠️  IPC service is already initialized')
      return
    }

    // 设置通用 IPC 请求处理
    ipcMain.handle('ipc-request', async (event, request: IPCRequest) => {
      const context: IPCContext = {
        request,
        sender: event.sender,
        timestamp: Date.now()
      }

      return await this.router.handleRequest(context)
    })

    // 设置流式请求处理
    ipcMain.on('ipc-stream-request', async (event, request: IPCRequest) => {
      const context: IPCContext = {
        request,
        sender: event.sender,
        timestamp: Date.now()
      }

      await this.router.handleStreamRequest(context, (channel, data) => {
        event.sender.send(channel, data)
      })
    })

    // 注册内置处理器
    this.registerBuiltinHandlers()

    this.initialized = true
    console.log('✓ IPC service initialized successfully')
  }

  // 注册处理器
  handle<TRequest = any, TResponse = any>(
    channel: string,
    handler: IPCHandler<TRequest, TResponse>
  ): void {
    this.router.handle(channel, handler)
  }

  // 注册流式处理器
  handleStream<TRequest = any, TData = any>(
    channel: string,
    handler: IPCStreamHandler<TRequest, TData>
  ): void {
    this.router.handleStream(channel, handler)
  }

  // 添加中间件
  use(middleware: IPCMiddleware): void {
    this.router.use(middleware)
  }

  // 发送事件到所有窗口
  broadcast<T = any>(channel: string, data: T): void {
    const event: IPCEvent<T> = {
      channel,
      data,
      timestamp: Date.now()
    }

    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(`event-${channel}`, event)
      }
    })
  }

  // 发送事件到特定窗口
  sendToWindow<T = any>(windowId: number, channel: string, data: T): void {
    const window = BrowserWindow.fromId(windowId)
    if (window && !window.isDestroyed()) {
      const event: IPCEvent<T> = {
        channel,
        data,
        timestamp: Date.now()
      }
      window.webContents.send(`event-${channel}`, event)
    }
  }

  // 注册内置处理器
  private registerBuiltinHandlers(): void {
    // 系统相关处理器
    this.handle(IPC_CHANNELS.PING, {
      handle: () => 'pong'
    })

    this.handle(IPC_CHANNELS.GET_APP_INFO, {
      handle: () => ({
        name: 'Knowlex Desktop',
        version: process.env.npm_package_version || '1.0.0',
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      })
    })

    console.log('✓ Built-in IPC handlers registered')
  }

  // 获取路由器实例（用于高级用法）
  getRouter(): IPCRouter {
    return this.router
  }

  // 销毁服务
  destroy(): void {
    if (this.initialized) {
      ipcMain.removeHandler('ipc-request')
      ipcMain.removeAllListeners('ipc-stream-request')
      this.initialized = false
      console.log('✓ IPC service destroyed')
    }
  }
}

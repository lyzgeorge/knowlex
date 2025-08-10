// IPC 客户端封装 - 渲染进程端
import type { IPCStreamData, IPCError } from '@shared'
import { IPC_CHANNELS, IPC_STREAM_CHANNELS, IPC_EVENT_CHANNELS } from '@shared'

// 扩展 Window 接口以包含 Knowlex API
declare global {
  interface Window {
    knowlexAPI: {
      invoke: <T = any>(channel: string, data?: any) => Promise<T>
      onStream: <T = any>(channel: string, callback: (data: T) => void) => () => void
      onEvent: <T = any>(channel: string, callback: (data: T) => void) => () => void
      system: any
      database: any
      project: any
      conversation: any
      message: any
      file: any
      llm: any
      rag: any
      memory: any
      knowledge: any
      search: any
      settings: any
      events: any
    }
    IPC_CONSTANTS: {
      CHANNELS: typeof IPC_CHANNELS
      STREAM_CHANNELS: typeof IPC_STREAM_CHANNELS
      EVENT_CHANNELS: typeof IPC_EVENT_CHANNELS
    }
  }
}

// IPC 客户端类
export class IPCClient {
  private static instance: IPCClient
  private isReady = false

  static getInstance(): IPCClient {
    if (!this.instance) {
      this.instance = new IPCClient()
    }
    return this.instance
  }

  private constructor() {
    this.checkAPIAvailability()
  }

  private checkAPIAvailability(): void {
    if (typeof window !== 'undefined' && window.knowlexAPI) {
      this.isReady = true
      console.log('✅ Knowlex API is ready')
    } else {
      console.warn('⏳ Waiting for Knowlex API to be available...')
      // Wait for the preload script to expose the API
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.knowlexAPI) {
          this.isReady = true
          console.log('✅ Knowlex API is now ready')
          clearInterval(checkInterval)
        }
      }, 100)

      // Stop checking after 10 seconds
      setTimeout(() => {
        if (!this.isReady) {
          clearInterval(checkInterval)
          console.error('❌ Knowlex API failed to load after 10 seconds. Check preload script.')
        }
      }, 10000)
    }
  }

  private ensureReady(): void {
    if (!this.isReady) {
      throw new Error('IPC Client is not ready. Knowlex API is not available.')
    }
  }

  // 基础 IPC 调用
  async invoke<T = any>(channel: string, data?: any): Promise<T> {
    this.ensureReady()
    try {
      return await window.knowlexAPI.invoke<T>(channel, data)
    } catch (error) {
      console.error(`IPC invoke failed for channel '${channel}':`, error)
      throw error
    }
  }

  // 监听流式数据
  onStream<T = any>(channel: string, callback: (data: T) => void): () => void {
    this.ensureReady()
    return window.knowlexAPI.onStream<T>(channel, callback)
  }

  // 监听事件
  onEvent<T = any>(channel: string, callback: (data: T) => void): () => void {
    this.ensureReady()
    return window.knowlexAPI.onEvent<T>(channel, callback)
  }

  // 系统相关 API
  get system() {
    this.ensureReady()
    return window.knowlexAPI.system
  }

  // 数据库相关 API
  get database() {
    this.ensureReady()
    return window.knowlexAPI.database
  }

  // 项目相关 API
  get project() {
    this.ensureReady()
    return window.knowlexAPI.project
  }

  // 对话相关 API
  get conversation() {
    this.ensureReady()
    return window.knowlexAPI.conversation
  }

  // 消息相关 API
  get message() {
    this.ensureReady()
    return window.knowlexAPI.message
  }

  // 文件相关 API
  get file() {
    this.ensureReady()
    return window.knowlexAPI.file
  }

  // LLM 相关 API
  get llm() {
    this.ensureReady()
    return window.knowlexAPI.llm
  }

  // RAG 相关 API
  get rag() {
    this.ensureReady()
    return window.knowlexAPI.rag
  }

  // 记忆相关 API
  get memory() {
    this.ensureReady()
    return window.knowlexAPI.memory
  }

  // 知识相关 API
  get knowledge() {
    this.ensureReady()
    return window.knowlexAPI.knowledge
  }

  // 搜索相关 API
  get search() {
    this.ensureReady()
    return window.knowlexAPI.search
  }

  // 设置相关 API
  get settings() {
    this.ensureReady()
    return window.knowlexAPI.settings
  }

  // 事件相关 API
  get events() {
    this.ensureReady()
    return window.knowlexAPI.events
  }

  // 获取 IPC 常量
  get constants() {
    return window.IPC_CONSTANTS
  }

  // 检查 API 是否可用
  get ready(): boolean {
    return this.isReady
  }
}

// 导出单例实例
export const ipcClient = IPCClient.getInstance()

// 流式响应处理器接口
export interface StreamResponseHandler<T = any> {
  onStart?: () => void
  onData: (data: T) => void
  onEnd?: () => void
  onError?: (error: IPCError) => void
}

// 流式响应包装器
export class StreamWrapper<T = any> {
  private cleanup?: () => void
  private isActive = false

  constructor(
    private channel: string,
    private handler: StreamResponseHandler<T>
  ) {}

  // 开始监听流式数据
  start(): void {
    if (this.isActive) {
      console.warn(`Stream for channel '${this.channel}' is already active`)
      return
    }

    this.isActive = true

    this.cleanup = ipcClient.onStream(this.channel, (streamData: IPCStreamData<T>) => {
      if (!this.isActive) return

      switch (streamData.type) {
        case 'start':
          this.handler.onStart?.()
          break
        case 'data':
          if (streamData.data !== undefined) {
            this.handler.onData(streamData.data)
          }
          break
        case 'end':
          this.handler.onEnd?.()
          this.stop()
          break
        case 'error':
          if (streamData.error) {
            this.handler.onError?.(streamData.error)
          }
          this.stop()
          break
      }
    })
  }

  // 停止监听
  stop(): void {
    if (this.cleanup) {
      this.cleanup()
      this.cleanup = undefined
    }
    this.isActive = false
  }

  // 是否正在活跃监听
  get active(): boolean {
    return this.isActive
  }
}

// 创建流式响应监听器
export function createStreamListener<T = any>(
  channel: string,
  handler: StreamResponseHandler<T>
): StreamWrapper<T> {
  return new StreamWrapper(channel, handler)
}

// 便捷的流式 LLM 响应处理
export function createLLMStreamListener(
  onToken: (token: string) => void,
  onComplete?: () => void,
  onError?: (error: IPCError) => void
): StreamWrapper<{ content?: string; complete?: boolean }> {
  return createStreamListener(IPC_STREAM_CHANNELS.LLM_STREAM_RESPONSE, {
    onData: (data) => {
      if (data.content) {
        onToken(data.content)
      }
      if (data.complete) {
        onComplete?.()
      }
    },
    onError
  })
}

// 便捷的文件处理进度监听
export function createFileProgressListener(
  onProgress: (progress: {
    fileId: string
    filename: string
    status: string
    progress: number
  }) => void,
  onError?: (error: IPCError) => void
): StreamWrapper<any> {
  return createStreamListener(IPC_STREAM_CHANNELS.FILE_PROCESS_PROGRESS, {
    onData: onProgress,
    onError
  })
}

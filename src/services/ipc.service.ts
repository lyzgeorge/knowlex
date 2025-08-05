/**
 * IPC Service for Renderer Process
 *
 * Provides a clean API for communicating with the main process via IPC.
 * Handles message validation, error handling, and streaming data.
 */

import {
  IPCMessage,
  IPCResponse,
  StreamChunk,
  IPC_CHANNELS,
  STREAM_EVENTS,
  IPCChannel,
  SendMessageRequest,
  CreateProjectRequest,
  UpdateProjectRequest,
  FileUploadRequest,
  AppSettings,
  TestAPIRequest,
  FullTextSearchRequest,
  VectorSearchRequest,
} from '../types/ipc.types'

export class IPCService {
  private messageId: number = 0
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private streamHandlers: Map<string, StreamHandler> = new Map()

  constructor() {
    this.setupIPCListeners()
  }

  /**
   * Send a request to the main process
   */
  async request<TRequest, TResponse>(
    channel: IPCChannel,
    data: TRequest,
    timeout = 30000
  ): Promise<TResponse> {
    const messageId = this.generateMessageId()
    const message: IPCMessage<{ channel: IPCChannel; data: TRequest }> = {
      id: messageId,
      timestamp: Date.now(),
      data: { channel, data },
    }

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(messageId)
        reject(new Error(`IPC request timeout for channel: ${channel}`))
      }, timeout)

      // Store pending request
      this.pendingRequests.set(messageId, {
        resolve,
        reject,
        timeoutId,
        channel,
      })

      // Send message to main process
      try {
        window.electronAPI.send('ipc:request', message)
      } catch (error) {
        this.pendingRequests.delete(messageId)
        clearTimeout(timeoutId)
        reject(new Error(`Failed to send IPC request: ${error}`))
      }
    })
  }

  /**
   * Start a streaming request
   */
  startStream<TRequest>(
    channel: IPCChannel,
    data: TRequest,
    onData: (chunk: StreamChunk) => void,
    onError?: (error: Error) => void,
    onEnd?: () => void
  ): StreamController {
    const sessionId = this.generateMessageId()

    const handler: StreamHandler = {
      onData,
      onError: onError || (() => {}),
      onEnd: onEnd || (() => {}),
    }

    this.streamHandlers.set(sessionId, handler)

    // Send initial stream request
    const message: IPCMessage<{ channel: IPCChannel; data: TRequest; sessionId: string }> = {
      id: sessionId,
      timestamp: Date.now(),
      data: { channel, data, sessionId },
    }

    window.electronAPI.send('ipc:request', message)

    return new StreamController(sessionId, this)
  }

  /**
   * Setup IPC listeners
   */
  private setupIPCListeners(): void {
    // Handle regular responses
    window.electronAPI.on('ipc:response', (response: IPCResponse<unknown>) => {
      const pending = this.pendingRequests.get(response.id)
      if (pending) {
        clearTimeout(pending.timeoutId)
        this.pendingRequests.delete(response.id)

        if (response.success) {
          pending.resolve(response.data)
        } else {
          const error = new Error(response.error?.message || 'Unknown IPC error')
          ;(error as any).code = response.error?.code
          ;(error as any).details = response.error?.details
          pending.reject(error)
        }
      }
    })

    // Handle stream data
    window.electronAPI.on(STREAM_EVENTS.DATA, (chunk: StreamChunk<unknown>) => {
      const handler = this.streamHandlers.get(chunk.id)
      if (handler) {
        handler.onData(chunk)

        if (chunk.isLast) {
          handler.onEnd()
          this.streamHandlers.delete(chunk.id)
        }
      }
    })

    // Handle stream errors
    window.electronAPI.on(
      STREAM_EVENTS.ERROR,
      ({ sessionId, error }: { sessionId: string; error: { message?: string } }) => {
        const handler = this.streamHandlers.get(sessionId)
        if (handler) {
          handler.onError(new Error(error.message || 'Stream error'))
          this.streamHandlers.delete(sessionId)
        }
      }
    )

    // Handle stream end
    window.electronAPI.on(STREAM_EVENTS.END, ({ sessionId }: { sessionId: string }) => {
      const handler = this.streamHandlers.get(sessionId)
      if (handler) {
        handler.onEnd()
        this.streamHandlers.delete(sessionId)
      }
    })
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageId}`
  }

  /**
   * Stop a stream (internal method)
   */
  stopStream(sessionId: string): void {
    window.electronAPI.send('stream:control', { sessionId, action: 'stop' })
    this.streamHandlers.delete(sessionId)
  }

  /**
   * Pause a stream (internal method)
   */
  pauseStream(sessionId: string): void {
    window.electronAPI.send('stream:control', { sessionId, action: 'pause' })
  }

  /**
   * Resume a stream (internal method)
   */
  resumeStream(sessionId: string): void {
    window.electronAPI.send('stream:control', { sessionId, action: 'resume' })
  }

  /**
   * Cleanup all pending requests and streams
   */
  cleanup(): void {
    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('IPC service cleanup'))
    }
    this.pendingRequests.clear()

    // Clear all stream handlers
    this.streamHandlers.clear()
  }
}

/**
 * Stream Controller for managing streaming requests
 */
export class StreamController {
  private isActive: boolean = true

  constructor(
    private sessionId: string,
    private ipcService: IPCService
  ) {}

  /**
   * Stop the stream
   */
  stop(): void {
    if (this.isActive) {
      this.ipcService.stopStream(this.sessionId)
      this.isActive = false
    }
  }

  /**
   * Pause the stream
   */
  pause(): void {
    if (this.isActive) {
      this.ipcService.pauseStream(this.sessionId)
    }
  }

  /**
   * Resume the stream
   */
  resume(): void {
    if (this.isActive) {
      this.ipcService.resumeStream(this.sessionId)
    }
  }

  /**
   * Check if stream is active
   */
  get active(): boolean {
    return this.isActive
  }
}

// Internal types
interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeoutId: NodeJS.Timeout
  channel: IPCChannel
}

interface StreamHandler {
  onData: (chunk: StreamChunk<unknown>) => void
  onError: (error: Error) => void
  onEnd: () => void
}

// Export singleton instance
export const ipcService = new IPCService()

// Export convenience methods for common operations
export const ipcAPI = {
  // Chat operations
  sendMessage: (data: SendMessageRequest) =>
    ipcService.request(IPC_CHANNELS.CHAT_SEND_MESSAGE, data),
  generateTitle: (data: { conversationId: string }) =>
    ipcService.request(IPC_CHANNELS.CHAT_GENERATE_TITLE, data),
  generateSummary: (data: { conversationId: string }) =>
    ipcService.request(IPC_CHANNELS.CHAT_GENERATE_SUMMARY, data),

  // Project operations
  createProject: (data: CreateProjectRequest) =>
    ipcService.request(IPC_CHANNELS.PROJECT_CREATE, data),
  listProjects: () => ipcService.request(IPC_CHANNELS.PROJECT_LIST, {}),
  getProject: (id: number) => ipcService.request(IPC_CHANNELS.PROJECT_GET, { id }),
  updateProject: (data: UpdateProjectRequest) =>
    ipcService.request(IPC_CHANNELS.PROJECT_UPDATE, data),
  deleteProject: (id: number) => ipcService.request(IPC_CHANNELS.PROJECT_DELETE, { id }),

  // File operations
  uploadFiles: (data: FileUploadRequest) => ipcService.request(IPC_CHANNELS.FILE_UPLOAD, data),
  listFiles: (projectId: number) => ipcService.request(IPC_CHANNELS.FILE_LIST, { projectId }),
  deleteFile: (id: number) => ipcService.request(IPC_CHANNELS.FILE_DELETE, { id }),
  getFileStatus: (id: number) => ipcService.request(IPC_CHANNELS.FILE_PROCESS_STATUS, { id }),

  // Settings operations
  getSettings: () => ipcService.request(IPC_CHANNELS.SETTINGS_GET, {}),
  setSettings: (data: Partial<AppSettings>) => ipcService.request(IPC_CHANNELS.SETTINGS_SET, data),
  testAPI: (data: TestAPIRequest) => ipcService.request(IPC_CHANNELS.SETTINGS_TEST_API, data),

  // Search operations
  searchFullText: (data: FullTextSearchRequest) =>
    ipcService.request(IPC_CHANNELS.SEARCH_FULLTEXT, data),
  searchVector: (data: VectorSearchRequest) => ipcService.request(IPC_CHANNELS.SEARCH_VECTOR, data),

  // Streaming operations
  streamChatResponse: (
    data: SendMessageRequest,
    onData: (chunk: StreamChunk) => void,
    onError?: (error: Error) => void,
    onEnd?: () => void
  ) => ipcService.startStream(IPC_CHANNELS.CHAT_STREAM_RESPONSE, data, onData, onError, onEnd),
}

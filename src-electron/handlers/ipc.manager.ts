/**
 * IPC Manager
 *
 * Central manager for all IPC communication between main and renderer processes.
 * Handles message routing, validation, and stream control.
 */

import { ipcMain, IpcMainEvent, WebContents } from 'electron'
import { EventEmitter } from 'events'
import {
  IPCMessage,
  IPCResponse,
  StreamChunk,
  StreamControl,
  STREAM_EVENTS,
  IPCChannel,
} from '../types/ipc.types'

export class IPCManager extends EventEmitter {
  private handlers: Map<IPCChannel, (message: IPCMessage, event: any) => Promise<IPCResponse>> =
    new Map()
  private streamSessions: Map<string, StreamSession> = new Map()
  private defaultStreamControl: StreamControl = {
    chunkSize: 1024, // 1KB chunks
    throttleMs: 10, // 10ms throttle
    maxBufferSize: 1024 * 1024, // 1MB max buffer
  }

  constructor() {
    super()
    this.setupIPCListeners()
  }

  /**
   * Register an IPC handler for a specific channel
   */
  registerHandler(
    channel: IPCChannel,
    handler: (message: IPCMessage, event: any) => Promise<IPCResponse>
  ): void {
    if (this.handlers.has(channel)) {
      console.warn(`Handler for channel '${channel}' already exists, overwriting`)
    }

    this.handlers.set(channel, handler)
    console.log(`Registered IPC handler for channel: ${channel}`)
  }

  /**
   * Unregister an IPC handler
   */
  unregisterHandler(channel: IPCChannel): void {
    this.handlers.delete(channel)
    console.log(`Unregistered IPC handler for channel: ${channel}`)
  }

  /**
   * Send response back to renderer
   */
  sendResponse(event: IpcMainEvent, response: IPCResponse): void {
    try {
      event.reply('ipc:response', response)
    } catch (error) {
      console.error('Failed to send IPC response:', error)
    }
  }

  /**
   * Start a streaming session
   */
  startStream(
    sessionId: string,
    webContents: WebContents,
    streamControl?: Partial<StreamControl>
  ): StreamSession {
    const control = { ...this.defaultStreamControl, ...streamControl }
    const session = new StreamSession(sessionId, webContents, control)

    this.streamSessions.set(sessionId, session)

    // Clean up session when it ends
    session.on('end', () => {
      this.streamSessions.delete(sessionId)
    })

    return session
  }

  /**
   * Get existing stream session
   */
  getStream(sessionId: string): StreamSession | undefined {
    return this.streamSessions.get(sessionId)
  }

  /**
   * Stop a streaming session
   */
  stopStream(sessionId: string): void {
    const session = this.streamSessions.get(sessionId)
    if (session) {
      session.end()
      this.streamSessions.delete(sessionId)
    }
  }

  /**
   * Setup IPC listeners
   */
  private setupIPCListeners(): void {
    // Handle regular IPC messages
    ipcMain.on('ipc:request', async (event, message: IPCMessage) => {
      try {
        await this.handleIPCMessage(event, message)
      } catch (error) {
        console.error('Error handling IPC message:', error)
        this.sendResponse(event, {
          id: message.id,
          success: false,
          error: {
            code: 'IPC_HANDLER_ERROR',
            message: 'Failed to handle IPC message',
            details: error instanceof Error ? error.message : String(error),
          },
          timestamp: Date.now(),
        })
      }
    })

    // Handle stream control messages
    ipcMain.on('stream:control', (event, { sessionId, action }) => {
      const session = this.streamSessions.get(sessionId)
      if (session) {
        switch (action) {
          case 'pause':
            session.pause()
            break
          case 'resume':
            session.resume()
            break
          case 'stop':
            session.end()
            break
        }
      }
    })

    console.log('IPC listeners setup complete')
  }

  /**
   * Handle incoming IPC message
   */
  private async handleIPCMessage(event: IpcMainEvent, message: IPCMessage): Promise<void> {
    const { channel } = message.data
    const handler = this.handlers.get(channel)

    if (!handler) {
      this.sendResponse(event, {
        id: message.id,
        success: false,
        error: {
          code: 'HANDLER_NOT_FOUND',
          message: `No handler registered for channel: ${channel}`,
        },
        timestamp: Date.now(),
      })
      return
    }

    try {
      const response = await handler(message, event)
      if (response) {
        this.sendResponse(event, response)
      }
    } catch (error) {
      console.error(`Error in handler for channel ${channel}:`, error)
      this.sendResponse(event, {
        id: message.id,
        success: false,
        error: {
          code: 'HANDLER_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : String(error),
        },
        timestamp: Date.now(),
      })
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Stop all active streams
    for (const [, session] of this.streamSessions) {
      session.end()
    }
    this.streamSessions.clear()

    // Remove all handlers
    this.handlers.clear()

    // Remove IPC listeners
    ipcMain.removeAllListeners('ipc:request')
    ipcMain.removeAllListeners('stream:control')

    console.log('IPC Manager cleanup complete')
  }
}

/**
 * Stream Session for handling streaming data
 */
class StreamSession extends EventEmitter {
  private buffer: Buffer = Buffer.alloc(0)
  private sequence: number = 0
  private isPaused: boolean = false
  private isEnded: boolean = false
  private throttleTimer: NodeJS.Timeout | null = null

  constructor(
    public readonly sessionId: string,
    private webContents: WebContents,
    private control: StreamControl
  ) {
    super()
  }

  /**
   * Write data to the stream
   */
  write(data: string | Buffer): boolean {
    if (this.isEnded) {
      return false
    }

    const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8')

    // Check buffer size limit
    if (this.buffer.length + chunk.length > this.control.maxBufferSize) {
      this.emit('error', new Error('Stream buffer overflow'))
      return false
    }

    this.buffer = Buffer.concat([this.buffer, chunk])

    if (!this.isPaused) {
      this.flush()
    }

    return true
  }

  /**
   * End the stream
   */
  end(finalData?: string | Buffer): void {
    if (this.isEnded) {
      return
    }

    if (finalData) {
      this.write(finalData)
    }

    this.flush(true)
    this.isEnded = true
    this.emit('end')
  }

  /**
   * Pause the stream
   */
  pause(): void {
    this.isPaused = true
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer)
      this.throttleTimer = null
    }
    this.emit('pause')
  }

  /**
   * Resume the stream
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false
      this.flush()
      this.emit('resume')
    }
  }

  /**
   * Flush buffered data to renderer
   */
  private flush(isLast: boolean = false): void {
    if (this.isPaused || this.isEnded) {
      return
    }

    if (this.buffer.length === 0 && !isLast) {
      return
    }

    const chunkSize = Math.min(this.buffer.length, this.control.chunkSize)
    const chunkData = this.buffer.slice(0, chunkSize)
    this.buffer = this.buffer.slice(chunkSize)

    const chunk: StreamChunk = {
      id: this.sessionId,
      sequence: this.sequence++,
      data: chunkData.toString('utf8'),
      isLast: isLast && this.buffer.length === 0,
      timestamp: Date.now(),
    }

    try {
      this.webContents.send(STREAM_EVENTS.DATA, chunk)
    } catch (error) {
      this.emit('error', error)
      return
    }

    // Continue flushing if there's more data
    if (this.buffer.length > 0 || (!isLast && !this.isPaused)) {
      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = null
        this.flush(isLast)
      }, this.control.throttleMs)
    }
  }
}

// Export singleton instance
export const ipcManager = new IPCManager()

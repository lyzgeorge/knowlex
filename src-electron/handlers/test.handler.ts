/**
 * Test IPC Handler
 *
 * Demonstrates the IPC framework functionality with test endpoints.
 * This handler will be removed in production but serves as an example
 * for implementing other handlers.
 */

import { IpcMainEvent } from 'electron'
import { BaseIPCHandler } from './base.handler'
import { IPCMessage, IPCResponse } from '../types/ipc.types'
import { validateIPCMessage, sanitizeMessageData, ipcRateLimiter } from '../utils/validation'

export class TestIPCHandler extends BaseIPCHandler {
  protected handlerName = 'TestHandler'

  /**
   * Handle echo test - returns the same data that was sent
   */
  async handleEcho(message: IPCMessage, _event: IpcMainEvent): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      this.log('info', 'Echo test request', sanitizeMessageData(data))

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 100))

      return {
        echo: data,
        timestamp: Date.now(),
        message: 'Echo test successful',
      }
    })
  }

  /**
   * Handle ping test - returns pong with timing information
   */
  async handlePing(message: IPCMessage, _event: IpcMainEvent): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      const startTime = Date.now()

      // Check rate limiting
      const clientId = `${event.processId}-${event.frameId}`
      if (!ipcRateLimiter.isAllowed(clientId)) {
        throw new Error('Rate limit exceeded')
      }

      this.log('info', 'Ping test request')

      return {
        pong: true,
        requestTime: data.timestamp || message.timestamp,
        responseTime: Date.now(),
        processingTime: Date.now() - startTime,
        clientId,
      }
    })
  }

  /**
   * Handle error test - intentionally throws an error for testing error handling
   */
  async handleError(message: IPCMessage, _event: IpcMainEvent): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      this.log('info', 'Error test request')

      const errorType = data.errorType || 'generic'

      switch (errorType) {
        case 'validation':
          throw new Error('Validation error test')
        case 'timeout':
          await new Promise(resolve => setTimeout(resolve, 5000))
          return { message: 'This should not be reached' }
        case 'network': {
          const networkError = new Error('Network connection failed')
          ;(networkError as any).code = 'NETWORK_ERROR'
          throw networkError
        }
        default:
          throw new Error('Generic error test')
      }
    })
  }

  /**
   * Handle validation test - tests various validation scenarios
   */
  async handleValidation(message: IPCMessage, _event: IpcMainEvent): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async data => {
      this.log('info', 'Validation test request')

      // Test required fields validation
      this.validateRequired(data, ['testField'])

      // Test custom validation
      if (data.testField === 'invalid') {
        throw new Error('Test field cannot be "invalid"')
      }

      return {
        message: 'Validation test passed',
        validatedData: data,
      }
    })
  }

  /**
   * Handle stream test - demonstrates streaming functionality
   */
  async handleStreamTest(message: IPCMessage, event: IpcMainEvent): Promise<IPCResponse | null> {
    try {
      validateIPCMessage(message)
      this.log('info', `Starting stream test: ${message.id}`)

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ipcManager } = require('./ipc.manager')
      const sessionId = message.data.sessionId || message.id
      const count = message.data.count || 10
      const delay = message.data.delay || 100

      // Start streaming session
      const stream = ipcManager.startStream(sessionId, event.sender, {
        chunkSize: 512,
        throttleMs: delay,
        maxBufferSize: 1024 * 10, // 10KB
      })

      // Send test data in chunks
      let counter = 0
      const interval = setInterval(() => {
        if (counter >= count) {
          clearInterval(interval)
          stream.end(`\nStream test completed. Sent ${count} chunks.`)
          return
        }

        const chunk = `Chunk ${counter + 1}/${count}: ${new Date().toISOString()}\n`
        stream.write(chunk)
        counter++
      }, delay)

      // Handle stream errors
      stream.on('error', error => {
        this.log('error', 'Stream test error', error)
        clearInterval(interval)
      })

      // Return immediate response (stream will continue separately)
      return this.createSuccessResponse(message.id, {
        message: 'Stream test started',
        sessionId,
        expectedChunks: count,
      })
    } catch (error) {
      this.log('error', 'Stream test setup error', error)
      return this.createErrorResponse(message.id, error as Error)
    }
  }
}

// Export singleton instance
export const testHandler = new TestIPCHandler()

/**
 * IPC Framework Tests
 *
 * Tests for the IPC communication framework including message validation,
 * error handling, and streaming functionality.
 */

// Mock Electron before importing other modules
jest.mock('electron', () => ({
  ipcMain: {
    on: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  BrowserWindow: jest.fn(),
  app: {
    whenReady: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  },
}))

import { IPCManager } from '../handlers/ipc.manager'
import {
  validateIPCMessage,
  validateIPCChannel,
  sanitizeMessageData,
  IPCRateLimiter,
} from '../utils/validation'
import { IPCMessage, IPC_CHANNELS } from '../types/ipc.types'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'node:test'
import { afterEach } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

const mockWebContents = {
  send: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
  id: 1,
}

describe('IPC Framework', () => {
  let ipcManager: IPCManager

  beforeEach(() => {
    ipcManager = new IPCManager()
  })

  afterEach(() => {
    ipcManager.cleanup()
  })

  describe('Message Validation', () => {
    test('should validate correct IPC message', () => {
      const message: IPCMessage = {
        id: 'test-123',
        timestamp: Date.now(),
        data: { test: 'data' },
      }

      expect(() => validateIPCMessage(message)).not.toThrow()
    })

    test('should reject message without ID', () => {
      const message = {
        timestamp: Date.now(),
        data: { test: 'data' },
      }

      expect(() => validateIPCMessage(message)).toThrow('Message must have a valid string ID')
    })

    test('should reject message without timestamp', () => {
      const message = {
        id: 'test-123',
        data: { test: 'data' },
      }

      expect(() => validateIPCMessage(message)).toThrow('Message must have a valid timestamp')
    })

    test('should reject message without data', () => {
      const message = {
        id: 'test-123',
        timestamp: Date.now(),
      }

      expect(() => validateIPCMessage(message)).toThrow('Message must have data property')
    })
  })

  describe('Channel Validation', () => {
    test('should validate correct IPC channel', () => {
      expect(() => validateIPCChannel(IPC_CHANNELS.SYSTEM_GET_INFO)).not.toThrow()
    })

    test('should reject invalid IPC channel', () => {
      expect(() => validateIPCChannel('invalid:channel')).toThrow('Invalid IPC channel')
    })
  })

  describe('Data Sanitization', () => {
    test('should sanitize sensitive data', () => {
      const data = {
        username: 'testuser',
        apiKey: 'secret-key-123',
        password: 'secret-password',
        normalField: 'normal-value',
      }

      const sanitized = sanitizeMessageData(data)

      expect(sanitized.username).toBe('testuser')
      expect(sanitized.apiKey).toBe('***REDACTED***')
      expect(sanitized.password).toBe('***REDACTED***')
      expect(sanitized.normalField).toBe('normal-value')
    })

    test('should handle nested objects', () => {
      const data = {
        config: {
          apiKey: 'secret-key',
          settings: {
            token: 'secret-token',
            value: 'normal',
          },
        },
      }

      const sanitized = sanitizeMessageData(data)

      expect(sanitized.config.apiKey).toBe('***REDACTED***')
      expect(sanitized.config.settings.token).toBe('***REDACTED***')
      expect(sanitized.config.settings.value).toBe('normal')
    })

    test('should handle arrays', () => {
      const data = [
        { apiKey: 'secret1', value: 'normal1' },
        { apiKey: 'secret2', value: 'normal2' },
      ]

      const sanitized = sanitizeMessageData(data)

      expect(sanitized[0].apiKey).toBe('***REDACTED***')
      expect(sanitized[0].value).toBe('normal1')
      expect(sanitized[1].apiKey).toBe('***REDACTED***')
      expect(sanitized[1].value).toBe('normal2')
    })
  })

  describe('Rate Limiting', () => {
    test('should allow requests within limit', () => {
      const rateLimiter = new IPCRateLimiter(5, 1000) // 5 requests per second
      const clientId = 'test-client'

      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true)
      }
    })

    test('should block requests exceeding limit', () => {
      const rateLimiter = new IPCRateLimiter(3, 1000) // 3 requests per second
      const clientId = 'test-client'

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        expect(rateLimiter.isAllowed(clientId)).toBe(true)
      }

      // 4th request should be blocked
      expect(rateLimiter.isAllowed(clientId)).toBe(false)
    })

    test('should reset after time window', async () => {
      const rateLimiter = new IPCRateLimiter(2, 100) // 2 requests per 100ms
      const clientId = 'test-client'

      // Use up the limit
      expect(rateLimiter.isAllowed(clientId)).toBe(true)
      expect(rateLimiter.isAllowed(clientId)).toBe(true)
      expect(rateLimiter.isAllowed(clientId)).toBe(false)

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be allowed again
      expect(rateLimiter.isAllowed(clientId)).toBe(true)
    })
  })

  describe('Handler Registration', () => {
    test('should register and unregister handlers', () => {
      const testHandler = jest.fn()
      const channel = IPC_CHANNELS.SYSTEM_GET_INFO

      ipcManager.registerHandler(channel, testHandler)
      expect(ipcManager['handlers'].has(channel)).toBe(true)

      ipcManager.unregisterHandler(channel)
      expect(ipcManager['handlers'].has(channel)).toBe(false)
    })

    test('should warn when overwriting existing handler', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      const channel = IPC_CHANNELS.SYSTEM_GET_INFO

      ipcManager.registerHandler(channel, handler1)
      ipcManager.registerHandler(channel, handler2)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Handler for channel'))

      consoleSpy.mockRestore()
    })
  })

  describe('Stream Management', () => {
    test('should create and manage stream sessions', () => {
      const sessionId = 'test-stream-123'
      const stream = ipcManager.startStream(sessionId, mockWebContents)

      expect(ipcManager.getStream(sessionId)).toBe(stream)
      expect(stream.sessionId).toBe(sessionId)
    })

    test('should clean up stream sessions on end', done => {
      const sessionId = 'test-stream-456'
      const stream = ipcManager.startStream(sessionId, mockWebContents)

      stream.on('end', () => {
        // Stream should be removed from manager after ending
        setTimeout(() => {
          expect(ipcManager.getStream(sessionId)).toBeUndefined()
          done()
        }, 10)
      })

      stream.end()
    })

    test('should handle stream data writing', () => {
      const sessionId = 'test-stream-789'
      const stream = ipcManager.startStream(sessionId, mockWebContents, {
        chunkSize: 10,
        throttleMs: 0,
        maxBufferSize: 100,
      })

      const testData = 'Hello World'
      stream.write(testData)

      // Should send data to renderer
      setTimeout(() => {
        expect(mockWebContents.send).toHaveBeenCalled()
        stream.end()
      }, 50)
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid message format', () => {
      const invalidMessage = 'not-an-object'

      expect(() => validateIPCMessage(invalidMessage)).toThrow('Message must be an object')
    })

    test('should handle null message', () => {
      expect(() => validateIPCMessage(null)).toThrow('Message must be an object')
    })

    test('should handle undefined message', () => {
      expect(() => validateIPCMessage(undefined)).toThrow('Message must be an object')
    })
  })
})

describe('IPC Types', () => {
  test('should have all required channel constants', () => {
    expect(IPC_CHANNELS.CHAT_SEND_MESSAGE).toBeDefined()
    expect(IPC_CHANNELS.PROJECT_CREATE).toBeDefined()
    expect(IPC_CHANNELS.FILE_UPLOAD).toBeDefined()
    expect(IPC_CHANNELS.SETTINGS_GET).toBeDefined()
    expect(IPC_CHANNELS.SEARCH_FULLTEXT).toBeDefined()
    expect(IPC_CHANNELS.SYSTEM_GET_INFO).toBeDefined()
  })

  test('should have unique channel values', () => {
    const channels = Object.values(IPC_CHANNELS)
    const uniqueChannels = new Set(channels)

    expect(channels.length).toBe(uniqueChannels.size)
  })
})

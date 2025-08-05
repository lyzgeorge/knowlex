/**
 * IPC Message Validation Utilities
 *
 * Provides validation functions for IPC messages to ensure data integrity
 * and security.
 */

import { IPCMessage, IPCChannel, IPC_CHANNELS } from '../types/ipc.types'

/**
 * Validate IPC message structure
 */
export function validateIPCMessage(message: any): message is IPCMessage {
  if (!message || typeof message !== 'object') {
    throw new Error('Message must be an object')
  }

  if (!message.id || typeof message.id !== 'string') {
    throw new Error('Message must have a valid string ID')
  }

  if (!message.timestamp || typeof message.timestamp !== 'number') {
    throw new Error('Message must have a valid timestamp')
  }

  if (message.data === undefined) {
    throw new Error('Message must have data property')
  }

  return true
}

/**
 * Validate IPC channel
 */
export function validateIPCChannel(channel: string): channel is IPCChannel {
  const validChannels = Object.values(IPC_CHANNELS)

  if (!validChannels.includes(channel as IPCChannel)) {
    throw new Error(`Invalid IPC channel: ${channel}`)
  }

  return true
}

/**
 * Sanitize message data for logging
 */
export function sanitizeMessageData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }

  const sensitiveFields = ['apiKey', 'password', 'token', 'secret', 'key', 'auth', 'authorization']

  const sanitized = Array.isArray(data) ? [...data] : { ...data }

  function sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    }

    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase()
      const isSensitive = sensitiveFields.some(field => lowerKey.includes(field))

      if (isSensitive && typeof value === 'string') {
        result[key] = '***REDACTED***'
      } else if (typeof value === 'object') {
        result[key] = sanitizeObject(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  return sanitizeObject(sanitized)
}

/**
 * Validate file upload data
 */
export function validateFileUpload(data: any): void {
  if (!data.projectId || typeof data.projectId !== 'number') {
    throw new Error('Valid project ID is required for file upload')
  }

  if (!data.files || !Array.isArray(data.files)) {
    throw new Error('Files array is required for file upload')
  }

  if (data.files.length === 0) {
    throw new Error('At least one file is required for upload')
  }

  // Validate each file
  for (const file of data.files) {
    if (!file.name || typeof file.name !== 'string') {
      throw new Error('Each file must have a valid name')
    }

    if (!file.path || typeof file.path !== 'string') {
      throw new Error('Each file must have a valid path')
    }

    if (!file.size || typeof file.size !== 'number' || file.size <= 0) {
      throw new Error('Each file must have a valid size')
    }

    // Check file size limit (1MB)
    const maxSize = 1024 * 1024 // 1MB
    if (file.size > maxSize) {
      throw new Error(`File ${file.name} exceeds maximum size of 1MB`)
    }

    // Check file extension
    const allowedExtensions = ['.txt', '.md']
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!allowedExtensions.includes(extension)) {
      throw new Error(
        `File ${file.name} has unsupported extension. Allowed: ${allowedExtensions.join(', ')}`
      )
    }
  }
}

/**
 * Validate project data
 */
export function validateProjectData(data: any): void {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('Project name is required and must be a non-empty string')
  }

  if (data.name.length > 100) {
    throw new Error('Project name must be 100 characters or less')
  }

  if (data.description && typeof data.description !== 'string') {
    throw new Error('Project description must be a string')
  }

  if (data.description && data.description.length > 200) {
    throw new Error('Project description must be 200 characters or less')
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(data.name)) {
    throw new Error('Project name contains invalid characters')
  }
}

/**
 * Validate search query
 */
export function validateSearchQuery(data: any): void {
  if (!data.query || typeof data.query !== 'string' || data.query.trim().length === 0) {
    throw new Error('Search query is required and must be a non-empty string')
  }

  if (data.query.length > 1000) {
    throw new Error('Search query must be 1000 characters or less')
  }

  if (data.limit && (typeof data.limit !== 'number' || data.limit <= 0 || data.limit > 100)) {
    throw new Error('Search limit must be a number between 1 and 100')
  }

  if (data.offset && (typeof data.offset !== 'number' || data.offset < 0)) {
    throw new Error('Search offset must be a non-negative number')
  }
}

/**
 * Validate API configuration
 */
export function validateAPIConfig(data: any): void {
  if (!data.type || typeof data.type !== 'string') {
    throw new Error('API type is required')
  }

  const validTypes = ['chat', 'embedding', 'rerank']
  if (!validTypes.includes(data.type)) {
    throw new Error(`Invalid API type. Must be one of: ${validTypes.join(', ')}`)
  }

  if (!data.config || typeof data.config !== 'object') {
    throw new Error('API config object is required')
  }

  const { config } = data

  if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim().length === 0) {
    throw new Error('API key is required')
  }

  if (!config.baseUrl || typeof config.baseUrl !== 'string' || config.baseUrl.trim().length === 0) {
    throw new Error('Base URL is required')
  }

  // Validate URL format
  try {
    new URL(config.baseUrl)
  } catch {
    throw new Error('Base URL must be a valid URL')
  }

  if (!config.model || typeof config.model !== 'string' || config.model.trim().length === 0) {
    throw new Error('Model name is required')
  }
}

/**
 * Rate limiting for IPC messages
 */
export class IPCRateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  /**
   * Check if request is allowed
   */
  isAllowed(clientId: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(clientId) || []

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return false
    }

    // Add current request
    validRequests.push(now)
    this.requests.set(clientId, validRequests)

    return true
  }

  /**
   * Clear old entries periodically
   */
  cleanup(): void {
    const now = Date.now()
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs)
      if (validRequests.length === 0) {
        this.requests.delete(clientId)
      } else {
        this.requests.set(clientId, validRequests)
      }
    }
  }
}

// Export singleton rate limiter
export const ipcRateLimiter = new IPCRateLimiter()

// Cleanup rate limiter every 5 minutes
setInterval(
  () => {
    ipcRateLimiter.cleanup()
  },
  5 * 60 * 1000
)

/**
 * Base IPC Handler
 *
 * Provides common functionality for all IPC handlers including validation,
 * error handling, and response formatting.
 */

import { IPCMessage, IPCResponse, IPCError } from '../types/ipc.types'

export abstract class BaseIPCHandler {
  protected abstract handlerName: string

  /**
   * Validate incoming IPC message
   */
  protected validateMessage<T>(message: IPCMessage<T>): void {
    if (!message.id) {
      throw new Error('Message ID is required')
    }
    if (!message.timestamp) {
      throw new Error('Message timestamp is required')
    }
    if (message.data === undefined) {
      throw new Error('Message data is required')
    }
  }

  /**
   * Create success response
   */
  protected createSuccessResponse<T>(messageId: string, data: T): IPCResponse<T> {
    return {
      id: messageId,
      success: true,
      data,
      timestamp: Date.now(),
    }
  }

  /**
   * Create error response
   */
  protected createErrorResponse(messageId: string, error: Error | IPCError): IPCResponse {
    const ipcError: IPCError =
      error instanceof Error
        ? {
            code: 'HANDLER_ERROR',
            message: error.message,
            details: error.stack,
          }
        : error

    return {
      id: messageId,
      success: false,
      error: ipcError,
      timestamp: Date.now(),
    }
  }

  /**
   * Log handler activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] [${this.handlerName}] ${message}`

    switch (level) {
      case 'info':
        console.log(logMessage, data || '')
        break
      case 'warn':
        console.warn(logMessage, data || '')
        break
      case 'error':
        console.error(logMessage, data || '')
        break
    }
  }

  /**
   * Handle IPC message with error catching
   */
  protected async handleWithErrorCatch<TRequest, TResponse>(
    message: IPCMessage<TRequest>,
    handler: (data: TRequest) => Promise<TResponse>
  ): Promise<IPCResponse<TResponse>> {
    try {
      this.validateMessage(message)
      this.log('info', `Handling message: ${message.id}`)

      const result = await handler(message.data)

      this.log('info', `Message handled successfully: ${message.id}`)
      return this.createSuccessResponse(message.id, result)
    } catch (error) {
      this.log('error', `Error handling message: ${message.id}`, error)
      return this.createErrorResponse(message.id, error as Error)
    }
  }

  /**
   * Validate required fields in request data
   */
  protected validateRequired<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[]
  ): void {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Required field '${String(field)}' is missing`)
      }
    }
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  protected sanitizeForLog(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data
    }

    const sensitiveFields = ['apiKey', 'password', 'token', 'secret']
    const sanitized = { ...data }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***'
      }
    }

    return sanitized
  }
}

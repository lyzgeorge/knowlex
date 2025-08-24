/**
 * Common IPC utilities and patterns
 * Consolidates error handling, validation, and response formatting across all IPC handlers
 */

import type { IPCResult } from '@shared/types/ipc'

/**
 * Wraps service calls with consistent error handling and response format
 * Ensures all IPC responses follow the IPCResult pattern
 */
export async function handleIPCCall<T>(operation: () => Promise<T>): Promise<IPCResult<T>> {
  try {
    const data = await operation()
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('IPC operation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Validates that an ID parameter is a non-empty string
 */
export function validateId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

/**
 * Validates that an ID parameter is valid, throws if not
 */
export function requireValidId(id: unknown, type: string = 'ID'): string {
  if (!validateId(id)) {
    throw new Error(`${type} is required and must be a non-empty string`)
  }
  return id
}

/**
 * Generic request validator that applies a type guard and throws on failure
 */
export function validateRequest<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  errorMessage: string = 'Invalid request data'
): T {
  if (!validator(data)) {
    throw new Error(errorMessage)
  }
  return data
}

/**
 * Validates that data is a non-null object
 */
export function validateObject(data: unknown): data is Record<string, any> {
  return data !== null && typeof data === 'object'
}

/**
 * Validates that a string property exists and is non-empty
 */
export function validateStringProperty(
  obj: Record<string, any>,
  property: string,
  required: boolean = true
): boolean {
  const value = obj[property]
  if (required) {
    return typeof value === 'string' && value.trim().length > 0
  }
  return value === undefined || (typeof value === 'string' && value.trim().length > 0)
}

/**
 * Validates that an array property exists and is non-empty
 */
export function validateArrayProperty(
  obj: Record<string, any>,
  property: string,
  required: boolean = true
): boolean {
  const value = obj[property]
  if (required) {
    return Array.isArray(value) && value.length > 0
  }
  return value === undefined || Array.isArray(value)
}

/**
 * Common validation patterns for different entity types
 */
export const ValidationPatterns = {
  /**
   * Validates conversation ID parameter
   */
  conversationId: (id: unknown): id is string => validateId(id),

  /**
   * Validates message ID parameter
   */
  messageId: (id: unknown): id is string => validateId(id),

  /**
   * Validates message role
   */
  messageRole: (role: unknown): role is 'user' | 'assistant' => {
    return typeof role === 'string' && ['user', 'assistant'].includes(role)
  },

  /**
   * Validates message content array
   */
  messageContent: (content: unknown): content is Array<any> => {
    return Array.isArray(content) && content.length > 0
  }
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  INVALID_CONVERSATION_ID: 'Invalid conversation ID',
  INVALID_MESSAGE_ID: 'Invalid message ID',
  INVALID_REQUEST_DATA: 'Invalid request data',
  CONVERSATION_NOT_FOUND: 'Conversation not found',
  MESSAGE_NOT_FOUND: 'Message not found',
  INVALID_MESSAGE_CONTENT: 'Invalid message content',
  INVALID_MESSAGE_ROLE: 'Invalid message role'
} as const

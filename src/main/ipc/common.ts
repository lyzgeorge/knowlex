/**
 * Common IPC utilities and patterns
 * Consolidates error handling, validation, and response formatting across all IPC handlers
 */

import type { ZodError, ZodTypeAny } from 'zod'
import type { IPCResult } from '@shared/types/ipc'
import { getErrorMessage } from '@shared/utils/error-handling'
import { ensureNonEmptyString } from '@shared/utils/validation'

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
      error: getErrorMessage(error, 'Unknown error occurred')
    }
  }
}

/**
 * Validates that an ID parameter is valid, throws if not
 */
export function requireValidId(id: unknown, type: string = 'ID'): string {
  return ensureNonEmptyString(id, type)
}

type SchemaOutput<S extends ZodTypeAny> = S['_output']

function formatZodError(error: ZodError, fallback?: string): string {
  if (error.issues.length === 0) {
    return fallback ?? 'Invalid request payload'
  }
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? ` (${issue.path.join('.')})` : ''
      return `${issue.message}${path}`
    })
    .join('; ')
}

/**
 * Parses incoming data with the provided Zod schema and normalizes errors.
 */
export function parseWithSchema<S extends ZodTypeAny>(
  schema: S,
  data: unknown,
  label?: string
): SchemaOutput<S> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const message = formatZodError(parsed.error, label)
    throw new Error(label ? `${label}: ${message}` : message)
  }
  return parsed.data
}

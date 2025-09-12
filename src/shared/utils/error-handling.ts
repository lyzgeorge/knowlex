/**
 * Error handling utilities to DRY up repeated patterns across the codebase.
 */

/**
 * Safely extracts a human-readable error message from an unknown error value.
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string' && error.trim().length > 0) return error
  try {
    return JSON.stringify(error)
  } catch {
    return fallback
  }
}

/**
 * Formats an operation failure message consistently.
 * Example: formatOperationError('create conversation', error)
 */
export function formatOperationError(operation: string, error: unknown): string {
  return `Failed to ${operation}: ${getErrorMessage(error)}`
}

/**
 * Factory that returns helpers bound to an operation name.
 */
export const createErrorHandler = (operation: string) => ({
  wrap: (error: unknown) => getErrorMessage(error, `Unknown error in ${operation}`),
  format: (details: string) => `Failed to ${operation}: ${details}`
})

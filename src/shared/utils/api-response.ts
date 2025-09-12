import type { IPCResult } from '@shared/types/ipc'
import { formatOperationError, getErrorMessage } from './error-handling'

/**
 * Ensures an IPCResult succeeded and contains data, throwing a standardized error otherwise.
 */
export function unwrapIPCResult<T>(res: IPCResult<T> | undefined | null, action: string): T {
  if (!res?.success || res.data === undefined) {
    const err = res?.error ?? 'Unknown error'
    throw new Error(formatOperationError(action, err))
  }
  return res.data
}

/**
 * Ensures an IPCResult succeeded (for actions with no data), throwing a standardized error otherwise.
 */
export function assertIPCResult(res: IPCResult<any> | undefined | null, action: string): void {
  if (!res?.success) {
    const err = res?.error ?? 'Unknown error'
    throw new Error(formatOperationError(action, err))
  }
}

/**
 * Converts any unknown error into a standardized failure message for an action.
 */
export function toActionError(action: string, error: unknown): string {
  return formatOperationError(action, getErrorMessage(error))
}

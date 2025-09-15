import type { Draft } from 'immer'
import { getErrorMessage, formatOperationError } from '@shared/utils/error-handling'

export interface AsyncOperationOptions<T> {
  setLoading?: ((loading: boolean) => (draft: any) => void) | undefined
  onError?: (error: string) => void
  onSuccess?: (result: T) => void
  /** If true, and the operation returns an IPC-like { success, data, error } object,
   *  the helper will automatically unwrap and throw a standardized error on failure.
   */
  autoUnwrap?: boolean
  /** Optional operation/action name used when formatting errors (e.g. 'create project') */
  action?: string
}

export async function runAsync<T>(
  set: (updater: (draft: Draft<any>) => void) => void,
  operation: () => Promise<T>,
  options: AsyncOperationOptions<T> = {}
): Promise<T> {
  const { setLoading, onError, onSuccess } = options

  if (setLoading) {
    set(setLoading(true))
  }
  set((s) => {
    s.error = null
  })

  try {
    const result = await operation()

    // If requested, auto-unwrap IPC-like responses of shape { success, data, error }
    if (options.autoUnwrap && result && typeof result === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = result
      if (typeof r.success === 'boolean') {
        if (!r.success) {
          const errMsg = r.error ?? 'Unknown error'
          const formatted = options.action
            ? formatOperationError(options.action, errMsg)
            : getErrorMessage(errMsg)
          throw new Error(formatted)
        }
        // If data present, use it as the result
        if ('data' in r) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return r.data as any
        }
      }
    }

    if (onSuccess) {
      onSuccess(result)
    }

    return result
  } catch (error) {
    const errorMessage = getErrorMessage(error, 'Operation failed')

    if (onError) {
      onError(errorMessage)
    } else {
      set((s) => {
        s.error = errorMessage
      })
    }

    throw error
  } finally {
    if (setLoading) {
      set(setLoading(false))
    }
  }
}

export function createLoadingSetter(property: string) {
  return (loading: boolean) => (draft: any) => {
    draft[property] = loading
  }
}

export const loadingSetters = {
  isLoading: createLoadingSetter('isLoading'),
  isLoadingMessages: createLoadingSetter('isLoadingMessages'),
  isSending: createLoadingSetter('isSending'),
  isLoadingMore: createLoadingSetter('isLoadingMore')
  // Add other common loading states here if needed
}

export async function runApiCall<T = void>(
  set: (updater: (draft: Draft<any>) => void) => void,
  apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>,
  errorMessage: string,
  onSuccess?: (data: T | undefined) => void,
  options: AsyncOperationOptions<any> = {}
): Promise<T | void> {
  return runAsync(
    set,
    async () => {
      const res = await apiCall()
      // If autoUnwrap is requested, let runAsync extract/throw; else keep current behavior
      if (options.autoUnwrap) {
        // Return the IPC response object so runAsync will unwrap it
        if (onSuccess) {
          onSuccess(res.data)
        }
        return res as any
      }

      if (!res?.success) {
        throw new Error(res?.error || errorMessage)
      }
      if (onSuccess) {
        onSuccess(res.data)
      }
    },
    options
  )
}

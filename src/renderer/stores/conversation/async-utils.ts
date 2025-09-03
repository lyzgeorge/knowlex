/**
 * Async Operation Utilities
 * Provides consistent error handling and loading state management
 */

import type { Draft } from 'immer'

export interface AsyncOperationOptions<T> {
  setLoading?: ((loading: boolean) => (draft: any) => void) | undefined
  onError?: (error: string) => void
  onSuccess?: (result: T) => void
}

/**
 * Wraps an async operation with consistent error handling
 */
export async function runAsync<T>(
  set: (updater: (draft: Draft<any>) => void) => void,
  operation: () => Promise<T>,
  options: AsyncOperationOptions<T> = {}
): Promise<T> {
  const { setLoading, onError, onSuccess } = options

  // Set loading state and clear previous error
  if (setLoading) {
    set(setLoading(true))
  }
  set((s) => {
    s.error = null
  })

  try {
    const result = await operation()

    if (onSuccess) {
      onSuccess(result)
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Operation failed'

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

/**
 * Creates a loading state setter for a specific property
 */
export function createLoadingSetter(property: string) {
  return (loading: boolean) => (draft: any) => {
    draft[property] = loading
  }
}

/**
 * Common loading state setters
 */
export const loadingSetters = {
  isLoading: createLoadingSetter('isLoading'),
  isLoadingMessages: createLoadingSetter('isLoadingMessages'),
  isSending: createLoadingSetter('isSending'),
  isLoadingMore: createLoadingSetter('isLoadingMore')
}

/**
 * Higher-order function to create async actions with consistent patterns
 */
export function createAsyncAction<TArgs extends any[], TResult>(
  operation: (...args: TArgs) => Promise<TResult>,
  loadingProperty?: keyof typeof loadingSetters
) {
  return (set: (updater: (draft: Draft<any>) => void) => void) => {
    return async (...args: TArgs): Promise<TResult> => {
      return runAsync(set, () => operation(...args), {
        setLoading: loadingProperty ? loadingSetters[loadingProperty] : undefined
      })
    }
  }
}

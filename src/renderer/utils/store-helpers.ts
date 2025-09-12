import type { Draft } from 'immer'
import { getErrorMessage } from '@shared/utils/error-handling'

export interface AsyncOperationOptions<T> {
  setLoading?: ((loading: boolean) => (draft: any) => void) | undefined
  onError?: (error: string) => void
  onSuccess?: (result: T) => void
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
): Promise<void> {
  return runAsync(
    set,
    async () => {
      const res = await apiCall()
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

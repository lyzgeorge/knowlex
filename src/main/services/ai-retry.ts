/**
 * Streaming retry strategy: try with reasoning params first, then fall back without
 */
export async function retryWithReasoningFallback<T>(
  attempt: (withReasoning: boolean) => Promise<T>,
  hasReasoning: boolean,
  isParamError: (e: any) => boolean,
  log?: { warn?: (msg: string) => void; error?: (e: any) => void }
): Promise<T> {
  try {
    return await attempt(true)
  } catch (error) {
    if (hasReasoning && isParamError(error)) {
      log?.warn?.('[AI] Retrying without reasoning parameters due to provider error...')
      try {
        return await attempt(false)
      } catch (e2) {
        log?.error?.(e2)
        throw e2
      }
    }
    throw error
  }
}

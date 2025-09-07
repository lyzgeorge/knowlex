export function formatUnknownError(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error) return err.message
  try {
    return String(err ?? fallback)
  } catch {
    return fallback
  }
}

export function processingErrorMessage(err: unknown): string {
  return `Processing failed: ${formatUnknownError(err)}`
}

export function criticalErrorMessage(err: unknown): string {
  return `Critical error: ${formatUnknownError(err)}`
}

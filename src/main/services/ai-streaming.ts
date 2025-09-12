import type { CancellationToken } from '@main/utils/cancellation'

/**
 * Callback interface for streaming events
 */
export interface StreamingCallbacks {
  // Fired when fullStream emits 'start'. Useful to lazily create resources (e.g., conversations/messages).
  onStreamStart?: () => void
  // Fired when fullStream emits 'start' for UI feedback (e.g., sparkle animation)
  onStart?: () => void
  // Text lifecycle
  onTextStart?: () => void
  // Fired for each assistant text delta
  onTextChunk: (chunk: string) => void
  onTextEnd?: () => void
  // Reasoning lifecycle
  onReasoningChunk?: (chunk: string) => void
  onReasoningStart?: () => void
  onReasoningEnd?: () => void
  // Fired when fullStream emits 'finish' (before awaiting final text)
  onStreamFinish?: () => void
}

/**
 * Consumes fullStream async iterable and forwards events to callbacks while
 * accumulating text and reasoning. Returns { text, reasoning } or throws on error.
 */
export async function consumeFullStream(
  fullStream: AsyncIterable<any>,
  callbacks: StreamingCallbacks,
  cancellationToken?: CancellationToken
): Promise<{ text: string; reasoning?: string; cancelled?: boolean }> {
  let accumulatedText = ''
  let accumulatedReasoning = ''
  let wasCancelled = false

  try {
    for await (const part of fullStream) {
      if (cancellationToken?.isCancelled) {
        wasCancelled = true
        break
      }

      switch (part.type) {
        case 'start':
          callbacks.onStreamStart?.()
          callbacks.onStart?.()
          break

        case 'text-start':
          callbacks.onTextStart?.()
          break

        case 'text-delta':
          if (part.text && part.text.length > 0) {
            accumulatedText += part.text
            callbacks.onTextChunk(part.text)
          }
          break

        case 'text-end':
          callbacks.onTextEnd?.()
          break

        case 'reasoning-start':
          callbacks.onReasoningStart?.()
          break

        case 'reasoning-delta':
          if (part.text && part.text.length > 0) {
            accumulatedReasoning += part.text
            callbacks.onReasoningChunk?.(part.text)
          }
          break

        case 'reasoning-end':
          callbacks.onReasoningEnd?.()
          break

        case 'finish':
          callbacks.onStreamFinish?.()
          break

        case 'error':
          console.error('AI streaming error:', part.error)
          throw part.error

        case 'start-step':
        case 'finish-step':
        case 'tool-call':
        case 'tool-result':
          // No-op
          break

        default:
          console.log('[AI] Unknown fullStream part type:', part.type)
      }
    }
  } catch (err) {
    console.error('[AI] FullStream error:', err)
    throw err
  }

  return {
    text: accumulatedText,
    ...(accumulatedReasoning ? { reasoning: accumulatedReasoning } : {}),
    ...(wasCancelled ? { cancelled: true } : {})
  }
}

/**
 * Generic Chunk Buffer System
 * Provides batched streaming updates to prevent excessive re-renders
 */

export type ChunkApplier<T> = (messageId: string, chunk: T) => void

export interface ChunkBuffer<T> {
  enqueue: (messageId: string, chunk: T) => void
  flush: () => void
  finalize: (messageId: string) => void
  clear: (messageId: string) => void
  destroy: () => void
}

/**
 * Creates a generic chunk buffer that batches updates using requestAnimationFrame
 */
export function createChunkBuffer<T>(
  applier: ChunkApplier<T>,
  combiner: (existing: T | undefined, newChunk: T) => T
): ChunkBuffer<T> {
  let pendingChunks: Record<string, T> = {}
  let flushHandle: number | null = null

  const requestFrame: (cb: FrameRequestCallback) => number =
    (window as any).requestAnimationFrame ||
    ((cb: FrameRequestCallback) => setTimeout(cb, 16) as any)

  const flush = () => {
    const chunks = pendingChunks
    pendingChunks = {}
    flushHandle = null

    const messageIds = Object.keys(chunks)
    if (messageIds.length === 0) return

    for (const messageId of messageIds) {
      const chunk = chunks[messageId]
      if (chunk !== undefined) {
        applier(messageId, chunk)
      }
    }
  }

  const enqueue = (messageId: string, chunk: T) => {
    pendingChunks[messageId] = combiner(pendingChunks[messageId], chunk)

    if (flushHandle === null) {
      flushHandle = requestFrame(flush)
    }
  }

  const finalize = (messageId: string) => {
    // Apply any remaining chunks for this message immediately
    const pendingChunk = pendingChunks[messageId]
    if (pendingChunk !== undefined) {
      applier(messageId, pendingChunk)
      delete pendingChunks[messageId]
    }
  }

  const clear = (messageId: string) => {
    delete pendingChunks[messageId]
  }

  const destroy = () => {
    if (flushHandle !== null) {
      if (typeof flushHandle === 'number') {
        cancelAnimationFrame(flushHandle)
      } else {
        clearTimeout(flushHandle)
      }
      flushHandle = null
    }
    pendingChunks = {}
  }

  return { enqueue, flush, finalize, clear, destroy }
}

// Text chunk combiner - concatenates strings
export const textChunkCombiner = (existing: string | undefined, newChunk: string): string => {
  return (existing || '') + newChunk
}

// Generic chunk combiner - just uses the new value
export const replaceChunkCombiner = <T>(_existing: T | undefined, newChunk: T): T => {
  return newChunk
}

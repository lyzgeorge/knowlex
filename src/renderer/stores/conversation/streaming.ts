/*
 * Streaming utilities (skeleton)
 * Will consolidate chunk-buffer.ts and chunk-appliers.ts here.
 */

/**
 * Streaming utilities: chunk buffers and appliers
 * Consolidated implementation of chunk buffering (batched updates) and
 * chunk appliers for text/reasoning. This module is the canonical place
 * for streaming-related logic.
 */

// --- chunk-buffer implementation ---
export type ChunkApplier<T> = (messageId: string, chunk: T) => void

export interface ChunkBuffer<T> {
  enqueue: (messageId: string, chunk: T) => void
  flush: () => void
  finalize: (messageId: string) => void
  clear: (messageId: string) => void
  destroy: () => void
}

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

// Generic chunk combiner - replace with new chunk
export const replaceChunkCombiner = <T>(_existing: T | undefined, newChunk: T): T => {
  return newChunk
}

// --- chunk-appliers implementation ---
import { CONVERSATION_CONSTANTS } from './utils'

export function applyTextChunkToDraft(message: any, combinedChunk: string) {
  const lastContent = message.content[message.content.length - 1]
  if (lastContent?.type === 'text') {
    const currentText =
      lastContent.text === CONVERSATION_CONSTANTS.ZERO_WIDTH_SPACE ? '' : lastContent.text || ''
    lastContent.text = currentText + combinedChunk
  } else {
    message.content.push({ type: 'text', text: combinedChunk })
  }
}

export function applyReasoningChunkToDraft(message: any, combinedChunk: string) {
  message.reasoning = (message.reasoning || '') + combinedChunk
}

export default {
  createChunkBuffer,
  textChunkCombiner,
  replaceChunkCombiner,
  applyTextChunkToDraft,
  applyReasoningChunkToDraft
}

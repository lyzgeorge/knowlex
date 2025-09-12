import { sendMessageEvent } from '@main/utils/ipc-events'

export function createBatchedEmitter(
  messageId: string,
  eventType: string,
  chunkProperty: string,
  flushInterval: number = 16
) {
  let pendingChunk = ''
  let flushTimer: NodeJS.Timeout | null = null

  const flush = () => {
    if (pendingChunk.length > 0) {
      sendMessageEvent(eventType, {
        messageId,
        [chunkProperty]: pendingChunk
      })
      pendingChunk = ''
    }
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
  }

  const schedule = () => {
    if (flushTimer) return
    flushTimer = setTimeout(flush, flushInterval)
  }

  const addChunk = (chunk: string) => {
    pendingChunk += chunk
    schedule()
  }

  return { addChunk, flush }
}

export type BatchedEmitter = ReturnType<typeof createBatchedEmitter>

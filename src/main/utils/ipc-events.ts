import { BrowserWindow } from 'electron'

/**
 * Broadcast helper: send event to all renderer windows under a namespaced prefix
 */
export function broadcast(prefix: string, eventType: string, data: unknown): void {
  const windows = BrowserWindow.getAllWindows()

  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(`${prefix}:${eventType}`, data)
    }
  })
}

export function sendConversationEvent(eventType: string, data: unknown): void {
  broadcast('conversation', eventType, data)
}

export function sendMessageEvent(eventType: string, data: unknown): void {
  broadcast('message', eventType, data)
}

export const CONVERSATION_EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  MOVED: 'moved',
  TITLE_GENERATED: 'title_generated'
} as const

export const MESSAGE_EVENTS = {
  ADDED: 'added',
  UPDATED: 'updated',
  DELETED: 'deleted',
  START: 'start',
  STREAMING_START: 'streaming_start',
  STREAMING_CHUNK: 'streaming_chunk',
  STREAMING_END: 'streaming_end',
  STREAMING_ERROR: 'streaming_error',
  STREAMING_CANCELLED: 'streaming_cancelled',
  TEXT_START: 'text_start',
  TEXT_END: 'text_end',
  REASONING_START: 'reasoning_start',
  REASONING_CHUNK: 'reasoning_chunk',
  REASONING_END: 'reasoning_end'
} as const

export default {
  broadcast,
  sendConversationEvent,
  sendMessageEvent,
  CONVERSATION_EVENTS,
  MESSAGE_EVENTS
}

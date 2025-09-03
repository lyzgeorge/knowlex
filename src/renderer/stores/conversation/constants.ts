/**
 * Constants for Conversation Store
 */

export const CONVERSATION_CONSTANTS = {
  // Pagination
  CONVERSATIONS_PAGE_SIZE: 15,

  // Batching intervals (ms)
  TEXT_CHUNK_FLUSH_INTERVAL: 16, // ~60fps
  REASONING_CHUNK_FLUSH_INTERVAL: 16,

  // Special text markers
  ZERO_WIDTH_SPACE: '\u200B',

  // Default values
  DEFAULT_CONVERSATION_TITLE: 'New Chat'
} as const

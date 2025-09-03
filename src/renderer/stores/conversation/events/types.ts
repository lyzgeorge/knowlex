/**
 * Event Type Definitions
 * Strongly typed event payloads for better type safety
 */

import type { Message } from '@shared/types/message'

// Conversation Events
export interface ConversationCreatedEvent {
  id: string
  title?: string
  createdAt?: string
  updatedAt?: string
  projectId?: string | null
  modelConfigId?: string
  settings?: any
}

export interface ConversationTitleGeneratedEvent {
  conversationId: string
  title: string
}

// Message Events
export interface MessageAddedEvent {
  id: string
  conversationId: string
  role?: string
  content?: any
  createdAt?: string
  updatedAt?: string
}

export interface MessageUpdatedEvent {
  id: string
  conversationId: string
  role?: string
  content?: any
  createdAt?: string
  updatedAt?: string
}

// Streaming Events
export interface MessageStreamingStartEvent {
  messageId: string
  message: Message
}

export interface MessageStreamingChunkEvent {
  messageId: string
  chunk: string
}

export interface MessageStreamingEndEvent {
  messageId: string
  message: Message
}

export interface MessageStreamingErrorEvent {
  messageId: string
  message: Message
  error: string
}

export interface MessageStreamingCancelledEvent {
  messageId: string
  message?: Message
}

export interface MessageReasoningStartEvent {
  messageId: string
}

export interface MessageReasoningChunkEvent {
  messageId: string
  chunk: string
}

export interface MessageReasoningEndEvent {
  messageId: string
}

export interface MessageStartEvent {
  messageId: string
}

export interface MessageTextStartEvent {
  messageId: string
}

export interface MessageTextEndEvent {
  messageId: string
}

// Event listener cleanup function
export type EventCleanupFunction = () => void

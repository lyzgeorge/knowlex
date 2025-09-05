/**
 * Consolidated Events Module
 * Combines event type definitions and all registration helpers into a single file.
 */
import type { Draft } from 'immer'
import type { ConversationState } from './types'
import type { Message } from '@shared/types/message'
import { nowISO, clearStreamingFlagsForMessage } from './utils'
import { addMessage, updateMessage } from './data'
import {
  createChunkBuffer,
  textChunkCombiner,
  applyTextChunkToDraft,
  applyReasoningChunkToDraft
} from './streaming'

// -----------------------------
// Type Definitions (merged from events/types.ts)
// -----------------------------

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
export type EventCleanupFunction = () => void

// -----------------------------
// Event Registration Helper
// -----------------------------
function createEventHandler<T>(
  eventName: string,
  handler: (
    setState: (updater: (draft: Draft<ConversationState>) => void) => void,
    data: T
  ) => void,
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): () => void {
  const on = window.knowlex?.events?.on
  if (!on) return () => {}

  const wrappedHandler = (_: any, data: T) => handler(setState, data)
  on(eventName, wrappedHandler)

  return () => {
    try {
      window.knowlex?.events?.off(eventName, wrappedHandler)
    } catch (e) {
      console.warn(`Failed to remove event listener: ${eventName}`, e)
    }
  }
}

function createEventRegistry(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void,
  eventHandlers: Array<{
    eventName: string
    handler: (
      setState: (updater: (draft: Draft<ConversationState>) => void) => void,
      data: any
    ) => void
  }>
): EventCleanupFunction {
  const on = window.knowlex?.events?.on
  if (!on) {
    console.warn('Event system not available')
    return () => {}
  }

  const cleanupFunctions = eventHandlers.map(({ eventName, handler }) =>
    createEventHandler(eventName, handler, setState)
  )

  return () => {
    cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup()
      } catch (e) {
        console.warn('Error during event cleanup:', e)
      }
    })
  }
}

// -----------------------------
// Conversation Events
// -----------------------------
export function registerConversationEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  return createEventRegistry(setState, [
    {
      eventName: 'conversation:created',
      handler: (setState, data: ConversationCreatedEvent) => {
        if (!data?.id) return
        setState((s) => {
          if (!s.conversations.find((c) => c.id === data.id)) {
            s.conversations.unshift(data as any)
            s.messages[data.id] = []
          }
        })
      }
    },
    {
      eventName: 'conversation:title_generated',
      handler: (setState, data: ConversationTitleGeneratedEvent) => {
        if (!data?.conversationId || !data?.title) return
        setState((s) => {
          const conversation = s.conversations.find((c) => c.id === data.conversationId)
          if (conversation) {
            conversation.title = data.title
            conversation.updatedAt = nowISO()
          }
        })
      }
    }
  ])
}

// -----------------------------
// Message Events
// -----------------------------
export function registerMessageEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  return createEventRegistry(setState, [
    {
      eventName: 'message:added',
      handler: (setState, data: MessageAddedEvent) => {
        if (!data?.id || !data?.conversationId) return
        setState((s) => {
          addMessage(s, data.conversationId, data as Message)
          if (!s.currentConversationId) s.currentConversationId = data.conversationId
          const conv = s.conversations.find((c) => c.id === data.conversationId)
          if (conv) conv.updatedAt = data.updatedAt || data.createdAt || nowISO()
        })
      }
    },
    {
      eventName: 'message:updated',
      handler: (setState, data: MessageUpdatedEvent) => {
        if (!data?.id || !data?.conversationId) return
        setState((s) => {
          updateMessage(s, data.id, (message) => {
            Object.assign(message, data)
          })
          const conv = s.conversations.find((c) => c.id === data.conversationId)
          if (conv) conv.updatedAt = data.updatedAt || nowISO()
        })
      }
    }
  ])
}

// -----------------------------
// Streaming Events
// -----------------------------
export function registerStreamingEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  const on = window.knowlex?.events?.on
  if (!on) {
    console.warn('Event system not available')
    return () => {}
  }

  // Helper function to update conversation timestamp by message ID
  const updateConversationTimestampByMessageId = (s: any, messageId: string) => {
    const idx = s.messageIndex[messageId]
    if (idx) {
      const conv = s.conversations.find((c: any) => c.id === idx.conversationId)
      if (conv) conv.updatedAt = nowISO()
    }
  }

  const textChunkBuffer = createChunkBuffer<string>((messageId, combinedChunk) => {
    setState((s) => {
      updateMessage(s, messageId, (message) => {
        applyTextChunkToDraft(message, combinedChunk)
      })
      updateConversationTimestampByMessageId(s, messageId)
    })
  }, textChunkCombiner)

  const reasoningChunkBuffer = createChunkBuffer<string>((messageId, combinedChunk) => {
    setState((s) => {
      updateMessage(s, messageId, (message) => {
        applyReasoningChunkToDraft(message, combinedChunk)
      })
      updateConversationTimestampByMessageId(s, messageId)
    })
  }, textChunkCombiner)

  const streamingEventHandlers = [
    {
      eventName: 'message:streaming_start',
      handler: (setState: any, data: MessageStreamingStartEvent) => {
        if (!data?.messageId || !data?.message) return
        setState((s: any) => {
          s.isStreaming = true
          s.streamingMessageId = data.messageId
          const cid = data.message.conversationId
          if (!s.currentConversationId) s.currentConversationId = cid
          addMessage(s, cid, data.message)
          const conv = s.conversations.find((c: any) => c.id === cid)
          if (conv) conv.updatedAt = data.message.updatedAt || data.message.createdAt || nowISO()
        })
      }
    },
    {
      eventName: 'message:streaming_chunk',
      handler: (_setState: any, data: MessageStreamingChunkEvent) => {
        if (!data?.messageId || !data?.chunk) return
        textChunkBuffer.enqueue(data.messageId, data.chunk)
      }
    },
    {
      eventName: 'message:streaming_end',
      handler: (setState: any, data: MessageStreamingEndEvent) => {
        if (!data?.messageId || !data?.message) return
        textChunkBuffer.finalize(data.messageId)
        reasoningChunkBuffer.finalize(data.messageId)
        setState((s: any) => {
          s.isStreaming = false
          s.streamingMessageId = null
          updateMessage(s, data.messageId, (current) => {
            const finalMsg = data.message
            if (current.reasoning && !finalMsg.reasoning) {
              finalMsg.reasoning = current.reasoning
            }
            Object.assign(current, finalMsg)
          })
          updateConversationTimestampByMessageId(s, data.messageId)
        })
      }
    },
    {
      eventName: 'message:streaming_error',
      handler: (setState: any, data: MessageStreamingErrorEvent) => {
        if (!data?.messageId || !data?.message) return
        textChunkBuffer.clear(data.messageId)
        reasoningChunkBuffer.clear(data.messageId)
        setState((s: any) => {
          s.isStreaming = false
          s.streamingMessageId = null
          s.error = data.error || 'Streaming failed'
          updateMessage(s, data.messageId, (m) => {
            Object.assign(m, data.message)
          })
          updateConversationTimestampByMessageId(s, data.messageId)
        })
      }
    },
    {
      eventName: 'message:streaming_cancelled',
      handler: (setState: any, data: MessageStreamingCancelledEvent) => {
        if (!data?.messageId) return
        textChunkBuffer.clear(data.messageId)
        reasoningChunkBuffer.clear(data.messageId)
        setState((s: any) => {
          clearStreamingFlagsForMessage(s, data.messageId)
          if (data.message) {
            updateMessage(s, data.messageId, (current) => {
              const partial = data.message!
              if (current.reasoning && !partial.reasoning) {
                partial.reasoning = current.reasoning
              }
              Object.assign(current, partial)
            })
            updateConversationTimestampByMessageId(s, data.messageId)
          }
        })
      }
    },
    {
      eventName: 'message:reasoning_start',
      handler: (setState: any, data: MessageReasoningStartEvent) => {
        if (!data?.messageId) return
        setState((s: any) => {
          s.isReasoningStreaming = true
          s.reasoningStreamingMessageId = data.messageId
          updateMessage(s, data.messageId, (message) => {
            if (!message.reasoning) message.reasoning = ''
          })
        })
      }
    },
    {
      eventName: 'message:reasoning_chunk',
      handler: (_setState: any, data: MessageReasoningChunkEvent) => {
        if (!data?.messageId || !data?.chunk) return
        reasoningChunkBuffer.enqueue(data.messageId, data.chunk)
      }
    },
    {
      eventName: 'message:reasoning_end',
      handler: (setState: any, data: MessageReasoningEndEvent) => {
        if (!data?.messageId) return
        setState((s: any) => {
          s.isReasoningStreaming = false
          s.reasoningStreamingMessageId = null
        })
      }
    },
    {
      eventName: 'message:start',
      handler: (setState: any, data: MessageStartEvent) => {
        if (!data?.messageId) return
        setState((s: any) => {
          s.isStartStreaming = true
          s.startStreamingMessageId = data.messageId
        })
      }
    },
    {
      eventName: 'message:text_start',
      handler: (setState: any, data: MessageTextStartEvent) => {
        if (!data?.messageId) return
        setState((s: any) => {
          s.isTextStreaming = true
          s.textStreamingMessageId = data.messageId
        })
      }
    },
    {
      eventName: 'message:text_end',
      handler: (setState: any, data: MessageTextEndEvent) => {
        if (!data?.messageId) return
        setState((s: any) => {
          s.isTextStreaming = false
          s.textStreamingMessageId = null
          if (s.startStreamingMessageId === data.messageId) {
            s.isStartStreaming = false
            s.startStreamingMessageId = null
          }
        })
      }
    }
  ]

  const cleanup = createEventRegistry(setState, streamingEventHandlers)

  return () => {
    textChunkBuffer.destroy()
    reasoningChunkBuffer.destroy()
    cleanup()
  }
}

// -----------------------------
// Aggregate Registration
// -----------------------------
export function registerAllEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  const conversationCleanup = registerConversationEvents(setState)
  const messageCleanup = registerMessageEvents(setState)
  const streamingCleanup = registerStreamingEvents(setState)
  return () => {
    try {
      conversationCleanup()
      messageCleanup()
      streamingCleanup()
    } catch (e) {
      console.error('Error during event cleanup:', e)
    }
  }
}

export default {
  registerAllEvents,
  registerConversationEvents,
  registerMessageEvents,
  registerStreamingEvents
}

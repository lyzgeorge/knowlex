/**
 * Streaming Event Handlers
 * Handles streaming message events with chunk buffering
 */

import type { Draft } from 'immer'
import type { ConversationState } from '../types'
import type {
  MessageStreamingStartEvent,
  MessageStreamingChunkEvent,
  MessageStreamingEndEvent,
  MessageStreamingErrorEvent,
  MessageStreamingCancelledEvent,
  MessageReasoningStartEvent,
  MessageReasoningChunkEvent,
  MessageReasoningEndEvent,
  MessageStartEvent,
  MessageTextStartEvent,
  MessageTextEndEvent,
  EventCleanupFunction
} from './types'
import { createChunkBuffer, textChunkCombiner } from '../chunk-buffer'
import { addMessage, updateMessage } from '../message-index'
// Message type intentionally not used directly in this module
import { CONVERSATION_CONSTANTS } from '../constants'

const nowISO = () => new Date().toISOString()

export function registerStreamingEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  const on = window.knowlex?.events?.on
  if (!on) {
    console.warn('Event system not available')
    return () => {}
  }

  // Store cleanup functions
  const cleanupFunctions: Array<() => void> = []

  // Create chunk buffers
  const textChunkBuffer = createChunkBuffer<string>((messageId, combinedChunk) => {
    setState((s) => {
      updateMessage(s, messageId, (message) => {
        const lastContent = message.content[message.content.length - 1]
        if (lastContent?.type === 'text') {
          const currentText =
            lastContent.text === CONVERSATION_CONSTANTS.ZERO_WIDTH_SPACE
              ? ''
              : lastContent.text || ''
          lastContent.text = currentText + combinedChunk
        } else {
          message.content.push({ type: 'text', text: combinedChunk })
        }
      })
      // Update parent conversation's updatedAt
      const idx = s.messageIndex[messageId]
      if (idx) {
        const conv = s.conversations.find((c) => c.id === idx.conversationId)
        if (conv) conv.updatedAt = new Date().toISOString()
      }
    })
  }, textChunkCombiner)

  const reasoningChunkBuffer = createChunkBuffer<string>((messageId, combinedChunk) => {
    setState((s) => {
      updateMessage(s, messageId, (message) => {
        message.reasoning = (message.reasoning || '') + combinedChunk
      })
      // Update parent conversation's updatedAt
      const idx = s.messageIndex[messageId]
      if (idx) {
        const conv = s.conversations.find((c) => c.id === idx.conversationId)
        if (conv) conv.updatedAt = new Date().toISOString()
      }
    })
  }, textChunkCombiner)

  // Streaming lifecycle events
  const handleStreamingStart = (_: any, data: MessageStreamingStartEvent) => {
    if (!data?.messageId || !data?.message) return

    setState((s) => {
      s.isStreaming = true
      s.streamingMessageId = data.messageId

      const cid = data.message.conversationId

      // Set current conversation if none is set
      if (!s.currentConversationId) {
        s.currentConversationId = cid
      }

      // Add or update message
      addMessage(s, cid, data.message)

      // Update conversation updatedAt
      const conv = s.conversations.find((c) => c.id === cid)
      if (conv) conv.updatedAt = data.message.updatedAt || data.message.createdAt || nowISO()
    })
  }
  on('message:streaming_start', handleStreamingStart)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:streaming_start', handleStreamingStart)
    } catch (e) {
      void e
    }
  })

  const handleStreamingChunk = (_: any, data: MessageStreamingChunkEvent) => {
    if (!data?.messageId || !data?.chunk) return
    textChunkBuffer.enqueue(data.messageId, data.chunk)
  }
  on('message:streaming_chunk', handleStreamingChunk)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:streaming_chunk', handleStreamingChunk)
    } catch (e) {
      void e
    }
  })

  const handleStreamingEnd = (_: any, data: MessageStreamingEndEvent) => {
    if (!data?.messageId || !data?.message) return

    // Finalize any pending chunks
    textChunkBuffer.finalize(data.messageId)
    reasoningChunkBuffer.finalize(data.messageId)

    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null

      // Update with final message, preserving reasoning if it exists
      updateMessage(s, data.messageId, (current) => {
        const finalMsg = data.message
        if (current.reasoning && !finalMsg.reasoning) {
          finalMsg.reasoning = current.reasoning
        }
        Object.assign(current, finalMsg)
      })

      // Update conversation updatedAt
      const idx = s.messageIndex[data.messageId]
      if (idx) {
        const conv = s.conversations.find((c) => c.id === idx.conversationId)
        if (conv) conv.updatedAt = data.message.updatedAt || data.message.createdAt || nowISO()
      }
    })
  }
  on('message:streaming_end', handleStreamingEnd)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:streaming_end', handleStreamingEnd)
    } catch (e) {
      void e
    }
  })

  const handleStreamingError = (_: any, data: MessageStreamingErrorEvent) => {
    if (!data?.messageId || !data?.message) return

    // Clear pending chunks
    textChunkBuffer.clear(data.messageId)
    reasoningChunkBuffer.clear(data.messageId)

    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null
      s.error = data.error || 'Streaming failed'

      updateMessage(s, data.messageId, (message) => {
        Object.assign(message, data.message)
      })

      // Update conversation updatedAt
      const idx = s.messageIndex[data.messageId]
      if (idx) {
        const conv = s.conversations.find((c) => c.id === idx.conversationId)
        if (conv) conv.updatedAt = data.message.updatedAt || new Date().toISOString()
      }
    })
  }
  on('message:streaming_error', handleStreamingError)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:streaming_error', handleStreamingError)
    } catch (e) {
      void e
    }
  })

  const handleStreamingCancelled = (_: any, data: MessageStreamingCancelledEvent) => {
    if (!data?.messageId) return

    // Clear pending chunks
    textChunkBuffer.clear(data.messageId)
    reasoningChunkBuffer.clear(data.messageId)

    setState((s) => {
      s.isStreaming = false
      s.streamingMessageId = null
      s.isStartStreaming = false
      s.startStreamingMessageId = null
      s.isReasoningStreaming = false
      s.reasoningStreamingMessageId = null
      s.isTextStreaming = false
      s.textStreamingMessageId = null

      if (data.message) {
        updateMessage(s, data.messageId, (current) => {
          const partial = data.message!
          if (current.reasoning && !partial.reasoning) {
            partial.reasoning = current.reasoning
          }
          Object.assign(current, partial)
        })

        // Update conversation updatedAt
        const idx = s.messageIndex[data.messageId]
        if (idx) {
          const conv = s.conversations.find((c) => c.id === idx.conversationId)
          if (conv) conv.updatedAt = data.message!.updatedAt || new Date().toISOString()
        }
      }
    })
  }
  on('message:streaming_cancelled', handleStreamingCancelled)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:streaming_cancelled', handleStreamingCancelled)
    } catch (e) {
      void e
    }
  })

  // Reasoning events
  const handleReasoningStart = (_: any, data: MessageReasoningStartEvent) => {
    if (!data?.messageId) return

    setState((s) => {
      s.isReasoningStreaming = true
      s.reasoningStreamingMessageId = data.messageId

      updateMessage(s, data.messageId, (message) => {
        if (!message.reasoning) {
          message.reasoning = ''
        }
      })
    })
  }
  on('message:reasoning_start', handleReasoningStart)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:reasoning_start', handleReasoningStart)
    } catch (e) {
      void e
    }
  })

  const handleReasoningChunk = (_: any, data: MessageReasoningChunkEvent) => {
    if (!data?.messageId || !data?.chunk) return
    reasoningChunkBuffer.enqueue(data.messageId, data.chunk)
  }
  on('message:reasoning_chunk', handleReasoningChunk)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:reasoning_chunk', handleReasoningChunk)
    } catch (e) {
      void e
    }
  })

  const handleReasoningEnd = (_: any, data: MessageReasoningEndEvent) => {
    if (!data?.messageId) return

    setState((s) => {
      s.isReasoningStreaming = false
      s.reasoningStreamingMessageId = null
    })
  }
  on('message:reasoning_end', handleReasoningEnd)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:reasoning_end', handleReasoningEnd)
    } catch (e) {
      void e
    }
  })

  // Start and text streaming events
  const handleStartEvent = (_: any, data: MessageStartEvent) => {
    if (!data?.messageId) return

    setState((s) => {
      s.isStartStreaming = true
      s.startStreamingMessageId = data.messageId
    })
  }
  on('message:start', handleStartEvent)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:start', handleStartEvent)
    } catch (e) {
      void e
    }
  })

  const handleTextStart = (_: any, data: MessageTextStartEvent) => {
    if (!data?.messageId) return

    setState((s) => {
      s.isTextStreaming = true
      s.textStreamingMessageId = data.messageId
    })
  }
  on('message:text_start', handleTextStart)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:text_start', handleTextStart)
    } catch (e) {
      void e
    }
  })

  const handleTextEnd = (_: any, data: MessageTextEndEvent) => {
    if (!data?.messageId) return

    setState((s) => {
      s.isTextStreaming = false
      s.textStreamingMessageId = null

      // Also stop start streaming when text ends
      if (s.startStreamingMessageId === data.messageId) {
        s.isStartStreaming = false
        s.startStreamingMessageId = null
      }
    })
  }
  on('message:text_end', handleTextEnd)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:text_end', handleTextEnd)
    } catch (e) {
      void e
    }
  })

  // Return cleanup function
  return () => {
    // Destroy chunk buffers
    textChunkBuffer.destroy()
    reasoningChunkBuffer.destroy()

    // Clean up event listeners
    cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup()
      } catch (error) {
        console.warn('Error during streaming event cleanup:', error)
      }
    })
  }
}

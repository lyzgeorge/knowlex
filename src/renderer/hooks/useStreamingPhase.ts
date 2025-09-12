/**
 * Streaming phase composer hook
 *
 * Wraps multiple store selectors to reduce prop complexity in AssistantMessage
 * and future progress indicators. Provides a unified streaming state interface.
 */

import { useMemo } from 'react'
import {
  useIsReasoningStreaming,
  useReasoningStreamingMessageId,
  useIsStartStreaming,
  useStartStreamingMessageId,
  useIsTextStreaming,
  useTextStreamingMessageId
} from '@renderer/stores/conversation/index'

export interface StreamingPhase {
  isReasoningStreaming: boolean
  isStartStreaming: boolean
  isTextStreaming: boolean
  isAnyStreaming: boolean
}

/**
 * Streaming phase composer hook
 *
 * @param messageId - The message ID to check streaming state for
 * @returns Unified streaming phase information
 */
export const useStreamingPhase = (messageId: string): StreamingPhase => {
  const isReasoningStreaming = useIsReasoningStreaming()
  const reasoningStreamingMessageId = useReasoningStreamingMessageId()
  const isStartStreaming = useIsStartStreaming()
  const startStreamingMessageId = useStartStreamingMessageId()
  const isTextStreaming = useIsTextStreaming()
  const textStreamingMessageId = useTextStreamingMessageId()

  return useMemo(() => {
    const isReasoningStreamingForMessage =
      isReasoningStreaming && reasoningStreamingMessageId === messageId
    const isStartStreamingForMessage = isStartStreaming && startStreamingMessageId === messageId
    const isTextStreamingForMessage = isTextStreaming && textStreamingMessageId === messageId

    return {
      isReasoningStreaming: isReasoningStreamingForMessage,
      isStartStreaming: isStartStreamingForMessage,
      isTextStreaming: isTextStreamingForMessage,
      isAnyStreaming:
        isReasoningStreamingForMessage || isStartStreamingForMessage || isTextStreamingForMessage
    }
  }, [
    messageId,
    isReasoningStreaming,
    reasoningStreamingMessageId,
    isStartStreaming,
    startStreamingMessageId,
    isTextStreaming,
    textStreamingMessageId
  ])
}

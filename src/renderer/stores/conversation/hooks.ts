import React from 'react'
import useConversationStore from './store'
import { EMPTY_MESSAGES } from './utils'

export const useCurrentConversation = () => {
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const conversations = useConversationStore((s) => s.conversations)
  const messages = useConversationStore((s) => s.messages)
  const setCurrentConversation = useConversationStore((s) => s.setCurrentConversation)
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages)

  const currentConversation = React.useMemo(() => {
    if (!currentConversationId) return null
    return conversations.find((c) => c.id === currentConversationId) || null
  }, [currentConversationId, conversations])

  const currentMessages = React.useMemo(() => {
    return currentConversationId
      ? messages[currentConversationId] || EMPTY_MESSAGES
      : EMPTY_MESSAGES
  }, [currentConversationId, messages])

  return { currentConversation, currentMessages, setCurrentConversation, isLoadingMessages }
}

// Export individual hooks
export const useConversations = () => useConversationStore((s) => s.conversations)
export const useConversationsLoading = () => useConversationStore((s) => s.isLoading)
export const useConversationsError = () => useConversationStore((s) => s.error)
export const useSendMessage = () => useConversationStore((s) => s.sendMessage)
export const useRegenerateMessage = () => useConversationStore((s) => s.regenerateMessage)
export const useEditMessage = () => useConversationStore((s) => s.editMessage)
export const useDeleteMessage = () => useConversationStore((s) => s.deleteMessage)
export const useIsSending = () => useConversationStore((s) => s.isSending)
export const useIsStreaming = () => useConversationStore((s) => s.isStreaming)
export const useStreamingMessageId = () => useConversationStore((s) => s.streamingMessageId)
export const useOnStreamingUpdate = () => useConversationStore((s) => s.onStreamingUpdate)
export const useSetStreamingState = () => useConversationStore((s) => s.setStreamingState)
export const useStopStreaming = () => useConversationStore((s) => s.stopStreaming)
export const useIsReasoningStreaming = () => useConversationStore((s) => s.isReasoningStreaming)
export const useReasoningStreamingMessageId = () =>
  useConversationStore((s) => s.reasoningStreamingMessageId)
export const useIsStartStreaming = () => useConversationStore((s) => s.isStartStreaming)
export const useStartStreamingMessageId = () =>
  useConversationStore((s) => s.startStreamingMessageId)
export const useIsTextStreaming = () => useConversationStore((s) => s.isTextStreaming)
export const useTextStreamingMessageId = () => useConversationStore((s) => s.textStreamingMessageId)

export default useConversationStore

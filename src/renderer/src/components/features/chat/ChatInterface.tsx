import React, { useRef, useEffect } from 'react'
import { Box, VStack, Spinner, Text } from '@chakra-ui/react'
import { useCurrentConversation, useStreamingMessageId } from '../../../stores/conversation'
import MessageList from './MessageList'
import ChatInputBox from './ChatInputBox'
import { useSendMessage, useStartNewChat, useConversationStore } from '../../../stores/conversation'
import { useAutoScroll } from '../../../hooks/useAutoScroll'
import type { ProcessedFile } from '../../../hooks/useFileUpload'
import type { MessageContent } from '../../../../../shared/types/message'

export interface ChatInterfaceProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * 聊天界面核心组件 - Task 17
 *
 * 实现要求:
 * - 聊天容器，当前会话检查，空状态处理
 * - 消息渲染，虚拟滚动，自动滚动
 * - 多部分内容渲染，Markdown支持，流式显示
 * - 支持MessageContentParts结构：text, image, citation, tool-call等
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const { currentConversation, currentMessages, isLoadingMessages } = useCurrentConversation()
  const streamingMessageId = useStreamingMessageId()
  const sendMessage = useSendMessage()
  const startNewChat = useStartNewChat()
  const conversationStore = useConversationStore()

  // Create a filtered dependency for assistant messages only
  const assistantMessages = currentMessages.filter((msg) => msg.role === 'assistant')

  // Auto-scroll to bottom when assistant messages change or streaming updates
  const scrollRef = useAutoScroll<HTMLDivElement>([assistantMessages, streamingMessageId])

  // Separate ref for immediate user message scrolling
  const userMessageCountRef = useRef(0)

  // Track user messages count and scroll immediately when user sends a message
  useEffect(() => {
    const userMessages = currentMessages.filter((msg) => msg.role === 'user')
    if (userMessages.length > userMessageCountRef.current) {
      // User sent a new message, scroll to bottom immediately regardless of current position
      if (scrollRef.current) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
          }
        })
      }
      userMessageCountRef.current = userMessages.length
    }
  }, [currentMessages, scrollRef])

  // Handle sending message from entrance
  const handleSendMessage = async (
    message: string,
    files: File[] = [],
    temporaryFiles: ProcessedFile[] = []
  ) => {
    console.log('handleSendMessage called with:', {
      message: message.substring(0, 50) + '...',
      filesCount: files.length,
      temporaryFilesCount: temporaryFiles.length
    })

    // Prepare message content
    const content: MessageContent = []
    if (message.trim()) {
      content.push({ type: 'text' as const, text: message })
    }

    // Add temporary file content parts or image parts
    temporaryFiles.forEach((file) => {
      if (!file.error) {
        console.log('handleSendMessage: Adding file to content:', {
          filename: file.filename,
          contentLength: file.content?.length,
          isImage: file.isImage
        })

        if (file.isImage) {
          // Add as image content part
          content.push({
            type: 'image' as const,
            image: {
              url: file.content, // This is a data URL
              alt: file.filename,
              mimeType: file.mimeType,
              size: file.size
            }
          })
        } else {
          // Add as temporary file content part
          content.push({
            type: 'temporary-file' as const,
            temporaryFile: {
              filename: file.filename,
              content: file.content,
              size: file.size,
              mimeType: file.mimeType
            }
          })
        }
      } else {
        console.log('handleSendMessage: Skipping file due to error:', {
          filename: file.filename,
          error: file.error
        })
      }
    })

    let conversationId = conversationStore.currentConversationId

    // Create new conversation if none exists
    if (!conversationId) {
      startNewChat()
      // Get the fresh pending conversation ID after startNewChat
      conversationId = useConversationStore.getState().pendingConversation?.id || null
    }

    if (conversationId) {
      console.log('handleSendMessage: Sending message with content parts:', content.length)
      await sendMessage(conversationId, content, files)
    }
  }

  // No conversation or pending conversation - show main welcome state
  if (!currentConversation) {
    return (
      <VStack
        spacing={8}
        textAlign="center"
        w="full"
        h="full"
        justify="center"
        align="center"
        px={8}
        className={className}
      >
        {/* Welcome Message */}
        <Text fontSize="3xl" fontWeight="medium" color="text.primary">
          How do you do?
        </Text>

        {/* Chat Entrance */}
        <ChatInputBox
          variant="main-entrance"
          onSendMessage={handleSendMessage}
          showFileAttachment={true}
        />
      </VStack>
    )
  }

  // Loading state
  if (isLoadingMessages) {
    return (
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        className={className}
      >
        <VStack spacing={4}>
          <Spinner size="lg" color="primary.500" />
          <Text color="text.secondary">Loading messages...</Text>
        </VStack>
      </Box>
    )
  }

  // Startup state: No messages but has conversation (including pending) - show welcome screen with conversation input
  if (currentMessages.length === 0) {
    // Use the main entrance handler for consistency, regardless of conversation state
    return (
      <VStack
        spacing={8}
        textAlign="center"
        w="full"
        h="full"
        justify="center"
        align="center"
        px={8}
        className={className}
      >
        {/* Welcome Message */}
        <Text fontSize="3xl" fontWeight="medium" color="text.primary">
          How do you do?
        </Text>

        {/* Chat Input - Always use main-entrance variant for consistency */}
        <ChatInputBox
          variant="main-entrance"
          onSendMessage={handleSendMessage}
          showFileAttachment={true}
        />
      </VStack>
    )
  }

  // Chat state: Messages exist - show conversation with floating input
  return (
    <Box
      flex={1}
      display="flex"
      flexDirection="column"
      h="100%"
      className={className}
      position="relative"
    >
      {/* Messages Area - Full height with floating input */}
      <Box ref={scrollRef} flex={1} overflowY="auto" minH={0} h="100%" px={4} py={6} pb="6rem">
        <MessageList messages={currentMessages} streamingMessageId={streamingMessageId} />
      </Box>

      {/* Floating Input Area */}
      <Box position="absolute" bottom={0} left={0} right={0} zIndex={10} pointerEvents="none">
        <Box pointerEvents="auto">
          <ChatInputBox conversationId={currentConversation.id} variant="conversation" />
        </Box>
      </Box>
    </Box>
  )
}

ChatInterface.displayName = 'ChatInterface'

export default ChatInterface

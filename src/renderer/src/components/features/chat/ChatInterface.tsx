import React, { useMemo } from 'react'
import { Box, VStack, Spinner, Text, IconButton } from '@chakra-ui/react'
import { useCurrentConversation, useStreamingMessageId } from '../../../stores/conversation'
import MessageList from './MessageList'
import ChatInputBox from './ChatInputBox'
import { useSendMessage } from '../../../stores/conversation'
import { useAutoScroll } from '../../../hooks/useAutoScroll'
import type { ProcessedFile } from '../../../hooks/useFileUpload'
import type { MessageContent } from '../../../../../shared/types/message'
import { FiChevronDown } from 'react-icons/fi'

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

  // Optimized dependencies - track actual content changes for auto-scroll
  const scrollDependencies = useMemo(() => {
    const assistantMessages = currentMessages.filter((msg: any) => msg.role === 'assistant')
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]

    // Calculate total text length for streaming detection
    const totalTextLength =
      lastAssistantMessage?.content?.reduce((total: number, part: any) => {
        if (part.type === 'text' && typeof part.text === 'string') {
          return total + part.text.length
        }
        return total
      }, 0) || 0

    return [
      currentMessages.length, // Total message count (includes user messages)
      assistantMessages.length, // Number of assistant messages
      lastAssistantMessage?.id, // ID of last assistant message
      lastAssistantMessage?.content?.length, // Number of content parts
      totalTextLength // Total text length (grows during streaming)
      // Removed updatedAt to prevent infinite loops
    ]
  }, [currentMessages])

  // We do NOT follow while streaming per requirements

  // Auto-scroll with optimized sticky detection
  const { scrollRef, anchorRef, forceScrollToBottom, isAtBottom } = useAutoScroll<HTMLDivElement>(
    scrollDependencies,
    {
      threshold: 128, // 8rem range for hiding scroll button (8 * 16px = 128px)
      enabled: true,
      smooth: true, // Smooth scrolling behavior
      follow: false
    }
  )

  // Track user message count to force scroll on user messages
  const userMessageCount = useMemo(
    () => currentMessages.filter((msg: any) => msg.role === 'user').length,
    [currentMessages]
  )

  // Force scroll when user sends a message (runs after user message is added)
  React.useEffect(() => {
    if (userMessageCount > 0) {
      // Scroll to bottom; bottom padding ensures last 6rem of user message remains visible
      forceScrollToBottom()
    }
  }, [userMessageCount, forceScrollToBottom])

  // Entering a conversation: auto scroll to bottom smoothly
  React.useEffect(() => {
    // Smooth scroll on conversation change or initial mount with a conversation
    if (!currentConversation) return
    // Delay to ensure list is laid out
    const id = requestAnimationFrame(() => {
      forceScrollToBottom()
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.id])

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
          // Add as image content part (AI SDK compatible format)
          content.push({
            type: 'image' as const,
            image: {
              image: file.content, // DataContent: base64 data URL
              mediaType: file.mimeType
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

    console.log('handleSendMessage: Sending message with content parts:', content.length)
    await sendMessage(
      content,
      files,
      currentConversation?.id ? { conversationId: currentConversation.id } : {}
    )
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
      <Box
        ref={scrollRef}
        flex={1}
        overflowY="auto"
        minH={0}
        h="100%"
        px={4}
        py={6}
        pb="6rem"
        sx={{
          overflowAnchor: 'none', // Disable scroll anchoring to prevent conflicts
          scrollBehavior: 'auto' // Let our hook control scroll behavior
        }}
      >
        <MessageList messages={currentMessages} streamingMessageId={streamingMessageId} />
        {/* Bottom anchor for robust sticky auto-scroll */}
        <Box ref={anchorRef} height="1px" visibility="hidden" aria-hidden />
      </Box>

      {/* Floating Input Area */}
      <Box position="absolute" bottom={0} left={0} right={0} zIndex={10} pointerEvents="none">
        {/* Scroll-to-bottom chevron positioned relative to input area */}
        {!isAtBottom && (
          <Box
            position="absolute"
            left={0}
            right={0}
            bottom="100%"
            display="flex"
            justifyContent="center"
            zIndex={1}
            pointerEvents="auto"
          >
            <IconButton
              aria-label="Scroll to bottom"
              icon={<FiChevronDown />}
              size="sm"
              colorScheme="gray"
              variant="solid"
              borderRadius="full"
              boxShadow="md"
              onClick={() => forceScrollToBottom()}
            />
          </Box>
        )}

        <Box pointerEvents="auto">
          <ChatInputBox variant="conversation" />
        </Box>
      </Box>
    </Box>
  )
}

ChatInterface.displayName = 'ChatInterface'

export default ChatInterface

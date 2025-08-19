import React from 'react'
import { HStack, IconButton, useToast, useDisclosure } from '@chakra-ui/react'
import { EditIcon, RepeatIcon, CopyIcon, ExternalLinkIcon, LinkIcon } from '@chakra-ui/icons'
import type { Message, MessageContentPart } from '../../../../../shared/types'
import { useRegenerateMessage, useForkConversation } from '../../../stores/conversation'
import MessageEditModal from './MessageEditModal'

export interface MessageActionIconsProps {
  /** The message this component acts on */
  message: Message
  /** Whether this component is visible (for hover states) */
  isVisible?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * 消息操作图标组件 - Task 19
 *
 * 实现要求:
 * - 消息悬浮菜单：Edit & Retry, Regenerate, Fork, Copy, Delete
 * - 消息编辑：内容修改，重新提交，历史替换
 * - 消息分叉：会话复制，历史截断，新分支创建
 * - 消息复制：Markdown内容复制到剪贴板
 * - 消息引用和跳转功能
 */
export const MessageActionIcons: React.FC<MessageActionIconsProps> = ({
  message,
  isVisible = true,
  className
}) => {
  const toast = useToast()
  const regenerateMessage = useRegenerateMessage()
  const forkConversation = useForkConversation()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()

  // Copy message content to clipboard as Markdown
  const handleCopy = async () => {
    try {
      // Convert message content to Markdown format
      const markdownContent = message.content
        .map((part: MessageContentPart) => {
          switch (part.type) {
            case 'text':
              return part.text || ''
            case 'image':
              return part.image ? `![${part.image.alt || 'Image'}](${part.image.url})` : ''
            case 'citation':
              return part.citation ? `> [${part.citation.filename}] ${part.citation.content}` : ''
            case 'tool-call':
              return part.toolCall
                ? `\`\`\`json\n${JSON.stringify(part.toolCall, null, 2)}\n\`\`\``
                : ''
            default:
              return ''
          }
        })
        .filter((content: string) => content.trim())
        .join('\n\n')

      await navigator.clipboard.writeText(markdownContent)

      toast({
        title: 'Message copied',
        description: 'Message content copied to clipboard as Markdown',
        status: 'success',
        duration: 2000,
        isClosable: true
      })
    } catch (error) {
      console.error('Failed to copy message:', error)
      toast({
        title: 'Copy failed',
        description: 'Failed to copy message to clipboard',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  // Handle edit message
  const handleEdit = async () => {
    onEditOpen()
  }

  // Handle copy message reference
  const handleCopyReference = async () => {
    try {
      const reference = `[Message ${message.id.slice(0, 8)}](message://${message.id})`
      await navigator.clipboard.writeText(reference)

      toast({
        title: 'Reference copied',
        description: 'Message reference copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true
      })
    } catch (error) {
      console.error('Failed to copy reference:', error)
      toast({
        title: 'Copy failed',
        description: 'Failed to copy message reference',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  // Handle regenerate
  const handleRegenerate = async () => {
    try {
      await regenerateMessage(message.id)
      toast({
        title: 'Regenerating',
        description: 'Generating new response...',
        status: 'info',
        duration: 2000,
        isClosable: true
      })
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      toast({
        title: 'Regenerate failed',
        description: 'Failed to regenerate message',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  // Handle fork conversation
  const handleFork = async () => {
    try {
      await forkConversation(message.id)
      toast({
        title: 'Conversation forked',
        description: 'New conversation created from this point',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    } catch (error) {
      console.error('Failed to fork conversation:', error)
      toast({
        title: 'Fork failed',
        description: 'Failed to create new conversation',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  }

  if (!isVisible) return null

  const isUserMessage = message.role === 'user'

  return (
    <>
      <HStack
        spacing={0}
        className={className}
        opacity={isVisible ? 1 : 0}
        transition="opacity 0.2s"
      >
        {/* Edit - Only for user messages */}
        {isUserMessage && (
          <IconButton
            aria-label="Edit message"
            icon={<EditIcon />}
            size="xs"
            variant="ghost"
            onClick={handleEdit}
            _hover={{ bg: 'surface.hover' }}
          />
        )}

        {/* Regenerate - Only for assistant messages */}
        {!isUserMessage && (
          <IconButton
            aria-label="Regenerate response"
            icon={<RepeatIcon />}
            size="xs"
            variant="ghost"
            onClick={handleRegenerate}
            _hover={{ bg: 'surface.hover' }}
          />
        )}

        {/* Fork conversation */}
        <IconButton
          aria-label="Fork conversation"
          icon={<ExternalLinkIcon />}
          size="xs"
          variant="ghost"
          onClick={handleFork}
          _hover={{ bg: 'surface.hover' }}
        />

        {/* Copy message reference */}
        <IconButton
          aria-label="Copy message reference"
          icon={<LinkIcon />}
          size="xs"
          variant="ghost"
          onClick={handleCopyReference}
          _hover={{ bg: 'surface.hover' }}
        />

        {/* Copy */}
        <IconButton
          aria-label="Copy message"
          icon={<CopyIcon />}
          size="xs"
          variant="ghost"
          onClick={handleCopy}
          _hover={{ bg: 'surface.hover' }}
        />
      </HStack>

      {/* Edit Modal */}
      <MessageEditModal
        isOpen={isEditOpen}
        onClose={onEditClose}
        message={message}
        conversationId={message.conversationId}
      />
    </>
  )
}

MessageActionIcons.displayName = 'MessageActionIcons'

export default MessageActionIcons

import React from 'react'
import { HStack, IconButton, useDisclosure } from '@chakra-ui/react'
import { EditIcon, RepeatIcon, CopyIcon } from '@chakra-ui/icons'
import type { Message, MessageContentPart } from '../../../../../shared/types/message'
import { useRegenerateMessage } from '../../../stores/conversation'
import { useNotifications } from '../../ui'
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
 * - 消息悬浮菜单：Edit & Retry, Regenerate, Copy, Delete
 * - 消息编辑：内容修改，重新提交，历史替换
 * - 消息复制：Markdown内容复制到剪贴板
 */
export const MessageActionIcons: React.FC<MessageActionIconsProps> = ({
  message,
  isVisible = true,
  className
}) => {
  const notifications = useNotifications()
  const regenerateMessage = useRegenerateMessage()
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure()

  // Convert message content to Markdown format
  const getMessageMarkdown = () => {
    return message.content
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
  }

  // Handle edit message
  const handleEdit = async () => {
    onEditOpen()
  }

  // Handle regenerate
  const handleRegenerate = async () => {
    try {
      await regenerateMessage(message.id)
      notifications.messageRegenerated()
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      notifications.messageError('Failed to regenerate message')
    }
  }

  // Handle copy - merged from CopyButton component
  const handleCopy = async () => {
    try {
      const content = getMessageMarkdown()
      await navigator.clipboard.writeText(content)
      notifications.success({
        title: 'Copied',
        description: 'Message content copied as Markdown',
        duration: 2000
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      notifications.error({
        title: 'Copy failed',
        description: 'Failed to copy',
        duration: 3000
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

        {/* Copy */}
        <IconButton
          aria-label="Copy to clipboard"
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

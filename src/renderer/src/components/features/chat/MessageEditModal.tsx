import React, { useState, useCallback } from 'react'
import { Textarea, VStack, HStack, Text, useToast } from '@chakra-ui/react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { Message } from '../../../shared/types/message'
import { useEditMessage, useSendMessage } from '../../../stores/conversation'

export interface MessageEditModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Message to edit */
  message: Message | null
  /** Conversation ID */
  conversationId: string
}

/**
 * 消息编辑模态框组件 - Task 19
 *
 * 实现要求:
 * - 消息编辑：内容修改，重新提交，历史替换
 * - 支持编辑用户消息并重新生成助手回复
 * - 保留消息历史记录和版本控制
 */
export const MessageEditModal: React.FC<MessageEditModalProps> = ({
  isOpen,
  onClose,
  message,
  conversationId
}) => {
  const [editedContent, setEditedContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()
  const editMessage = useEditMessage()
  const sendMessage = useSendMessage()

  // Initialize content when message changes
  React.useEffect(() => {
    if (message) {
      const textContent = message.content
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text)
        .join('\n')
      setEditedContent(textContent)
    }
  }, [message])

  // Handle save and retry
  const handleSaveAndRetry = useCallback(async () => {
    if (!message || !editedContent.trim()) return

    setIsSubmitting(true)
    try {
      // Update the original message
      await editMessage(message.id, [{ type: 'text', text: editedContent.trim() }])

      // If this is a user message, regenerate the assistant response
      if (message.role === 'user') {
        // For now, we'll just edit the message. In the future, we can implement
        // a regenerate functionality that replaces from a specific message
        await sendMessage(conversationId, [{ type: 'text', text: editedContent.trim() }], [])
      }

      toast({
        title: 'Message updated',
        description:
          message.role === 'user'
            ? 'Message updated and new response generated'
            : 'Message updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })

      onClose()
    } catch (error) {
      console.error('Failed to update message:', error)
      toast({
        title: 'Update failed',
        description: 'Failed to update message',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [message, editedContent, editMessage, sendMessage, conversationId, toast, onClose])

  // Handle save only
  const handleSaveOnly = useCallback(async () => {
    if (!message || !editedContent.trim()) return

    setIsSubmitting(true)
    try {
      await editMessage(message.id, [{ type: 'text', text: editedContent.trim() }])

      toast({
        title: 'Message updated',
        description: 'Message updated successfully',
        status: 'success',
        duration: 2000,
        isClosable: true
      })

      onClose()
    } catch (error) {
      console.error('Failed to update message:', error)
      toast({
        title: 'Update failed',
        description: 'Failed to update message',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [message, editedContent, editMessage, toast, onClose])

  const canSave =
    editedContent.trim().length > 0 &&
    editedContent.trim() !==
      (message?.content
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text)
        .join('\n') || '')

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Edit ${message?.role === 'user' ? 'Your' : 'Assistant'} Message`}
      footer={
        <HStack spacing={3}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSaveOnly} isDisabled={!canSave} isLoading={isSubmitting}>
            Save Only
          </Button>

          {message?.role === 'user' && (
            <Button
              colorScheme="blue"
              onClick={handleSaveAndRetry}
              isDisabled={!canSave}
              isLoading={isSubmitting}
            >
              Save & Retry
            </Button>
          )}
        </HStack>
      }
    >
      <VStack spacing={4} align="stretch">
        <Text fontSize="sm" color="text.secondary">
          {message?.role === 'user'
            ? 'Edit your message and optionally regenerate the assistant response.'
            : 'Edit the assistant message content.'}
        </Text>

        <Textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          placeholder="Type your message..."
          rows={8}
          resize="vertical"
        />
      </VStack>
    </Modal>
  )
}

MessageEditModal.displayName = 'MessageEditModal'

export default MessageEditModal

import { useCallback } from 'react'
import type { Message } from '@shared/types/message'
import { buildUserMessageBranchSendOptions } from '@shared/utils/message-branching'
import { copyMessageText, type CopyMessageTranslations } from '@shared/utils/message-utils'
import { useSendMessage, useRegenerateMessage } from '@renderer/stores/conversation/index'
import { useEditableMessage } from './useEditableMessage'
import { useNotifications } from '@renderer/components/ui'
import { useI18n } from './useI18n'

export interface UseMessageActionsResult {
  /** Copy message text to clipboard */
  copy: (message: Message) => Promise<void>
  /** Regenerate assistant message (only for latest assistant messages) */
  regenerate: (messageId: string) => Promise<void>
  /** Start editing a user message */
  edit: (message: Message) => void
  /** Send edited message content */
  sendEdited: (message: Message) => Promise<void>
  /** Cancel editing */
  cancelEdit: () => void
  /** Check if message can be regenerated */
  canRegenerate: (message: Message, isLatestAssistant: boolean) => boolean
  /** Check if message can be edited */
  canEdit: (message: Message) => boolean
  /** Check if edited content is valid and can be sent */
  canSendEdited: () => boolean
  /** Editable message instance for UI access */
  editableMessage: ReturnType<typeof useEditableMessage>
}

export interface UseMessageActionsOptions {
  /** Called when edit mode is started */
  onEditStart?: () => void
  /** Called when edit mode is cancelled */
  onEditCancel?: () => void
  /** Called when edited message is sent */
  onEditSent?: () => void
}

/**
 * Unified hook for message actions: copy, regenerate, edit, sendEdited
 * Removes duplication between AssistantMessage and UserMessage components
 */
export function useMessageActions(options: UseMessageActionsOptions = {}): UseMessageActionsResult {
  const { t } = useI18n()
  const notifications = useNotifications()
  const sendMessage = useSendMessage()
  const regenerateMessage = useRegenerateMessage()
  const editableMessage = useEditableMessage()

  // Copy message text using shared utility
  const copy = useCallback(
    async (message: Message) => {
      const translations: Partial<CopyMessageTranslations> = {
        copied: t('message.copied'),
        copiedDescription: t('message.copiedDescription'),
        copyFailed: t('message.copyFailed'),
        copyFailedDescription: t('message.copyFailedDescription')
      }
      await copyMessageText(message, notifications, translations)
    },
    [notifications, t]
  )

  // Regenerate assistant message
  const regenerate = useCallback(
    async (messageId: string) => {
      try {
        await regenerateMessage(messageId)
        notifications.success({
          title: 'Regenerating',
          description: 'Message is being regenerated',
          duration: 2000
        })
      } catch (error) {
        console.error('Failed to regenerate message:', error)
        notifications.error({
          title: 'Regeneration failed',
          description: 'Failed to regenerate message',
          duration: 3000
        })
      }
    },
    [regenerateMessage, notifications]
  )

  // Start editing a user message
  const edit = useCallback(
    (message: Message) => {
      editableMessage.initialize(message)
      options.onEditStart?.()
    },
    [editableMessage, options]
  )

  // Send edited message content
  const sendEdited = useCallback(
    async (message: Message) => {
      if (!editableMessage.isValid()) {
        return
      }

      try {
        const content = editableMessage.buildContent()
        const sendOptions = buildUserMessageBranchSendOptions(message)

        await sendMessage(content, sendOptions)

        // Reset editing state
        editableMessage.reset()
        options.onEditSent?.()
      } catch (error) {
        console.error('Failed to send edited message:', error)
        notifications.error({
          title: 'Send failed',
          description: 'Failed to send edited message',
          duration: 3000
        })
      }
    },
    [editableMessage, sendMessage, notifications, options]
  )

  // Cancel editing
  const cancelEdit = useCallback(() => {
    editableMessage.reset()
    options.onEditCancel?.()
  }, [editableMessage, options])

  // Check if message can be regenerated
  const canRegenerate = useCallback((message: Message, isLatestAssistant: boolean): boolean => {
    return message.role === 'assistant' && isLatestAssistant
  }, [])

  // Check if message can be edited
  const canEdit = useCallback((message: Message): boolean => {
    return message.role === 'user'
  }, [])

  // Check if edited content can be sent
  const canSendEdited = useCallback((): boolean => {
    return editableMessage.isValid() && !editableMessage.isProcessing
  }, [editableMessage])

  return {
    copy,
    regenerate,
    edit,
    sendEdited,
    cancelEdit,
    canRegenerate,
    canEdit,
    canSendEdited,
    editableMessage
  }
}

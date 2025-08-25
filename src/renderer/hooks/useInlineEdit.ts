import { useState, useCallback } from 'react'
import { useConversationStore } from '@renderer/stores/conversation'
import { useNotifications } from '@renderer/components/ui'

export function useInlineEdit() {
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const updateConversationTitle = useConversationStore((state) => state.updateConversationTitle)
  const notifications = useNotifications()

  const handleStartEdit = useCallback((conversationId: string, currentTitle: string) => {
    setEditingConversationId(conversationId)
    setEditingTitle(currentTitle)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingConversationId(null)
    setEditingTitle('')
  }, [])

  const handleInputBlur = useCallback(() => {
    setTimeout(() => {
      if (editingConversationId) {
        handleCancelEdit()
      }
    }, 150)
  }, [editingConversationId, handleCancelEdit])

  const handleConfirmEdit = useCallback(async () => {
    if (!editingConversationId || !editingTitle.trim()) return

    try {
      await updateConversationTitle(editingConversationId, editingTitle.trim())
      notifications.conversationRenamed()
      setEditingConversationId(null)
      setEditingTitle('')
    } catch (error) {
      notifications.conversationRenameFailed(
        error instanceof Error ? error.message : 'An error occurred'
      )
    }
  }, [editingConversationId, editingTitle, updateConversationTitle, notifications])

  return {
    editingConversationId,
    editingTitle,
    setEditingTitle,
    handleStartEdit,
    handleCancelEdit,
    handleInputBlur,
    handleConfirmEdit
  }
}

/**
 * Message Event Handlers
 * Handles message lifecycle events
 */

import type { Draft } from 'immer'
import type { ConversationState } from '../types'
import type { MessageAddedEvent, MessageUpdatedEvent, EventCleanupFunction } from './types'
import { addMessage, updateMessage } from '../message-index'
import type { Message } from '@shared/types/message'

export function registerMessageEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  const on = window.knowlex?.events?.on
  if (!on) {
    console.warn('Event system not available')
    return () => {}
  }

  // Store cleanup functions
  const cleanupFunctions: Array<() => void> = []

  // Message added
  const handleAdded = (_: any, data: MessageAddedEvent) => {
    if (!data?.id || !data?.conversationId) return

    setState((s) => {
      addMessage(s, data.conversationId, data as Message)

      // Set current conversation if none is set
      if (!s.currentConversationId) {
        s.currentConversationId = data.conversationId
      }

      // Update conversation updatedAt to reflect new message
      const conv = s.conversations.find((c) => c.id === data.conversationId)
      if (conv) {
        conv.updatedAt = data.updatedAt || data.createdAt || new Date().toISOString()
      }
    })
  }

  on('message:added', handleAdded)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:added', handleAdded)
    } catch (e) {
      // ignore
    }
  })

  // Message updated
  const handleUpdated = (_: any, data: MessageUpdatedEvent) => {
    if (!data?.id || !data?.conversationId) return

    setState((s) => {
      updateMessage(s, data.id, (message) => {
        Object.assign(message, data)
      })

      // Update conversation updatedAt to reflect message update
      const conv = s.conversations.find((c) => c.id === data.conversationId)
      if (conv) {
        conv.updatedAt = data.updatedAt || new Date().toISOString()
      }
    })
  }

  on('message:updated', handleUpdated)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('message:updated', handleUpdated)
    } catch (e) {
      // ignore
    }
  })

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup()
      } catch (error) {
        console.warn('Error during message event cleanup:', error)
      }
    })
  }
}

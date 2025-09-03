/**
 * Conversation Event Handlers
 * Handles conversation lifecycle events
 */

import type { Draft } from 'immer'
import type { ConversationState } from '../types'
import type {
  ConversationCreatedEvent,
  ConversationTitleGeneratedEvent,
  EventCleanupFunction
} from './types'

const nowISO = () => new Date().toISOString()

export function registerConversationEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  const on = window.knowlex?.events?.on
  if (!on) {
    console.warn('Event system not available')
    return () => {}
  }

  // Store cleanup functions
  const cleanupFunctions: Array<() => void> = []

  // Conversation created
  const handleCreated = (_: any, data: ConversationCreatedEvent) => {
    if (!data?.id) return

    setState((s) => {
      // Check if conversation already exists
      if (!s.conversations.find((c) => c.id === data.id)) {
        s.conversations.unshift(data as any) // Cast to Conversation type
        s.messages[data.id] = []
      }
    })
  }
  on('conversation:created', handleCreated)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('conversation:created', handleCreated)
    } catch (e) {
      void e
    }
  })

  // Conversation title generated
  const handleTitleGenerated = (_: any, data: ConversationTitleGeneratedEvent) => {
    if (!data?.conversationId || !data?.title) return

    setState((s) => {
      const conversation = s.conversations.find((c) => c.id === data.conversationId)
      if (conversation) {
        conversation.title = data.title
        conversation.updatedAt = nowISO()
      }
    })
  }
  on('conversation:title_generated', handleTitleGenerated)
  cleanupFunctions.push(() => {
    try {
      window.knowlex?.events?.off('conversation:title_generated', handleTitleGenerated)
    } catch (e) {
      void e
    }
  })

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup()
      } catch (error) {
        console.warn('Error during event cleanup:', error)
      }
    })
  }
}

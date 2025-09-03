/**
 * Event Registration Hub
 * Coordinates all event listeners with proper cleanup
 */

import type { Draft } from 'immer'
import type { ConversationState } from '../types'
import type { EventCleanupFunction } from './types'
import { registerConversationEvents } from './conversation-events'
import { registerMessageEvents } from './message-events'
import { registerStreamingEvents } from './streaming-events'

export function registerAllEvents(
  setState: (updater: (draft: Draft<ConversationState>) => void) => void
): EventCleanupFunction {
  // Register all event modules
  const conversationCleanup = registerConversationEvents(setState)
  const messageCleanup = registerMessageEvents(setState)
  const streamingCleanup = registerStreamingEvents(setState)

  // Return combined cleanup function
  return () => {
    try {
      conversationCleanup()
      messageCleanup()
      streamingCleanup()
    } catch (error) {
      console.error('Error during event cleanup:', error)
    }
  }
}

export type { EventCleanupFunction }

import type { NotificationPreset } from '@shared/types/notification'

/**
 * Centralized notification presets so renderer/main share identical copy text.
 */
export const NOTIFICATION_PRESETS = {
  // Message operations
  messageCopied: {
    type: 'success',
    title: 'Message copied',
    description: 'Message content copied to clipboard',
    duration: 2000
  },
  messageRegenerated: {
    type: 'info',
    title: 'Regenerating',
    description: 'Generating new response...',
    duration: 2000
  },
  messageError: {
    type: 'error',
    title: 'Message error',
    description: 'Failed to process message',
    duration: 4000
  },

  // General operations
  networkError: {
    type: 'error',
    title: 'Connection error',
    description: 'Please check your internet connection',
    duration: 5000
  },

  // AI operations
  aiGenerating: {
    type: 'info',
    title: 'Thinking',
    description: 'AI is generating response...',
    duration: 0,
    isClosable: false
  },
  aiError: {
    type: 'error',
    title: 'AI Error',
    description: 'Failed to get AI response',
    duration: 5000
  },

  // File operations
  fileValidationError: {
    type: 'error',
    title: 'File validation error',
    description: 'File does not meet requirements',
    duration: 4000
  },
  filesProcessed: {
    type: 'success',
    title: 'Files processed',
    description: 'Files processed successfully',
    duration: 3000
  },
  fileProcessingFailed: {
    type: 'error',
    title: 'File processing failed',
    description: 'Failed to process file',
    duration: 5000
  },

  // Conversation operations
  conversationRenamed: {
    type: 'success',
    title: 'Conversation renamed',
    description: 'Conversation title updated successfully',
    duration: 2000
  },
  conversationRenameFailed: {
    type: 'error',
    title: 'Failed to rename conversation',
    description: 'Could not update conversation title',
    duration: 3000
  },
  conversationDeleted: {
    type: 'success',
    title: 'Conversation deleted',
    description: 'Conversation removed successfully',
    duration: 2000
  },
  conversationDeleteFailed: {
    type: 'error',
    title: 'Failed to delete conversation',
    description: 'Could not remove conversation',
    duration: 3000
  }
} as const satisfies Record<string, NotificationPreset>

export type NotificationPresetKey = keyof typeof NOTIFICATION_PRESETS

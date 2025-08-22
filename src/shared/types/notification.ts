export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export type NotificationPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'

export interface NotificationOptions {
  /** Notification title */
  title?: string
  /** Notification description */
  description?: string
  /** Auto-close duration in milliseconds. Set to 0 to disable auto-close */
  duration?: number
  /** Whether the notification can be manually closed */
  isClosable?: boolean
  /** Notification position */
  position?: NotificationPosition
  /** Custom action button */
  action?: {
    label: string
    onClick: () => void
  }
}

export interface NotificationPreset extends NotificationOptions {
  type: NotificationType
}

// Common notification presets for the application
export const NOTIFICATION_PRESETS = {
  // File operations
  fileCopied: {
    type: 'success' as const,
    title: 'Copied',
    description: 'Content copied to clipboard',
    duration: 2000
  },
  fileUploaded: {
    type: 'success' as const,
    title: 'File uploaded',
    description: 'File processed successfully',
    duration: 3000
  },
  fileProcessing: {
    type: 'info' as const,
    title: 'Processing',
    description: 'File is being processed...',
    duration: 0, // Don't auto-close
    isClosable: false
  },
  fileError: {
    type: 'error' as const,
    title: 'File error',
    description: 'Failed to process file',
    duration: 5000
  },

  // Message operations
  messageCopied: {
    type: 'success' as const,
    title: 'Message copied',
    description: 'Message content copied to clipboard',
    duration: 2000
  },
  messageRegenerated: {
    type: 'info' as const,
    title: 'Regenerating',
    description: 'Generating new response...',
    duration: 2000
  },
  messageError: {
    type: 'error' as const,
    title: 'Message error',
    description: 'Failed to process message',
    duration: 4000
  },

  // General operations
  saved: {
    type: 'success' as const,
    title: 'Saved',
    description: 'Changes saved successfully',
    duration: 2000
  },
  deleted: {
    type: 'success' as const,
    title: 'Deleted',
    description: 'Item deleted successfully',
    duration: 2000
  },
  networkError: {
    type: 'error' as const,
    title: 'Connection error',
    description: 'Please check your internet connection',
    duration: 5000
  },

  // AI operations
  aiGenerating: {
    type: 'info' as const,
    title: 'Thinking',
    description: 'AI is generating response...',
    duration: 0,
    isClosable: false
  },
  aiError: {
    type: 'error' as const,
    title: 'AI Error',
    description: 'Failed to get AI response',
    duration: 5000
  },

  // File upload and validation
  fileTooMany: {
    type: 'error' as const,
    title: 'Too many files',
    description: 'Maximum file limit exceeded',
    duration: 4000
  },
  fileValidationError: {
    type: 'error' as const,
    title: 'File validation error',
    description: 'File does not meet requirements',
    duration: 4000
  },
  filesProcessed: {
    type: 'success' as const,
    title: 'Files processed',
    description: 'Files processed successfully',
    duration: 3000
  },
  fileProcessingFailed: {
    type: 'error' as const,
    title: 'File processing failed',
    description: 'Failed to process file',
    duration: 5000
  },

  // Conversation operations
  conversationRenamed: {
    type: 'success' as const,
    title: 'Conversation renamed',
    description: 'Conversation title updated successfully',
    duration: 2000
  },
  conversationRenameFailed: {
    type: 'error' as const,
    title: 'Failed to rename conversation',
    description: 'Could not update conversation title',
    duration: 3000
  },
  conversationDeleted: {
    type: 'success' as const,
    title: 'Conversation deleted',
    description: 'Conversation removed successfully',
    duration: 2000
  },
  conversationDeleteFailed: {
    type: 'error' as const,
    title: 'Failed to delete conversation',
    description: 'Could not remove conversation',
    duration: 3000
  },

  // Message edit operations
  messageUpdated: {
    type: 'success' as const,
    title: 'Message updated',
    description: 'Message content updated successfully',
    duration: 2000
  },
  messageUpdateFailed: {
    type: 'error' as const,
    title: 'Update failed',
    description: 'Failed to update message',
    duration: 3000
  }
} as const

export type NotificationPresetKey = keyof typeof NOTIFICATION_PRESETS

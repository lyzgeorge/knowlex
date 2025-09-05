import { useToast, UseToastOptions, useTheme } from '@chakra-ui/react'
import { useCallback } from 'react'
import {
  NotificationType,
  NotificationOptions,
  NotificationPresetKey,
  NOTIFICATION_PRESETS
} from '@shared/types/notification'

/**
 * Unified notification hook that wraps Chakra UI's useToast
 * with consistent styling and behavior patterns using proper design tokens
 */
export const useNotifications = () => {
  const toast = useToast()
  const theme = useTheme()

  // Convert our notification options to Chakra UI toast options with proper design tokens
  const convertToToastOptions = useCallback(
    (type: NotificationType, options: NotificationOptions = {}): UseToastOptions => {
      const {
        title,
        description,
        duration = 4000,
        isClosable = true,
        position = 'bottom',
        action
      } = options

      return {
        title,
        description,
        status: type,
        duration,
        isClosable,
        position,
        variant: 'solid',
        containerStyle: {
          maxWidth: theme.sizes?.md || '448px',
          margin: theme.space?.[4] || '1rem',
          borderRadius: theme.radii?.lg || '0.5rem',
          boxShadow:
            theme.shadows?.lg ||
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        },
        ...(action && {
          action: action.onClick,
          actionText: action.label
        })
      }
    },
    [theme]
  )

  // Generic notification function
  const notify = useCallback(
    (type: NotificationType, options: NotificationOptions = {}) => {
      const toastOptions = convertToToastOptions(type, options)
      return toast(toastOptions)
    },
    [toast, convertToToastOptions]
  )

  // Specific notification type functions
  const success = useCallback(
    (options: NotificationOptions = {}) => {
      return notify('success', options)
    },
    [notify]
  )

  const error = useCallback(
    (options: NotificationOptions = {}) => {
      return notify('error', options)
    },
    [notify]
  )

  const warning = useCallback(
    (options: NotificationOptions = {}) => {
      return notify('warning', options)
    },
    [notify]
  )

  const info = useCallback(
    (options: NotificationOptions = {}) => {
      return notify('info', options)
    },
    [notify]
  )

  // Preset notification function
  const preset = useCallback(
    (presetKey: NotificationPresetKey, overrides: Partial<NotificationOptions> = {}) => {
      const presetConfig = NOTIFICATION_PRESETS[presetKey]
      const mergedOptions = { ...presetConfig, ...overrides }
      const { type, ...options } = mergedOptions
      return notify(type, options)
    },
    [notify]
  )

  // Convenience functions for common operations

  const messageCopied = useCallback(() => {
    return preset('messageCopied')
  }, [preset])

  const messageRegenerated = useCallback(() => {
    return preset('messageRegenerated')
  }, [preset])

  const messageError = useCallback(
    (error?: string) => {
      return preset('messageError', {
        description: error || NOTIFICATION_PRESETS.messageError.description
      })
    },
    [preset]
  )

  const aiGenerating = useCallback(() => {
    return preset('aiGenerating')
  }, [preset])

  const aiError = useCallback(
    (error?: string) => {
      return preset('aiError', {
        description: error || NOTIFICATION_PRESETS.aiError.description
      })
    },
    [preset]
  )

  const networkError = useCallback(() => {
    return preset('networkError')
  }, [preset])

  // File upload and validation convenience functions
  const fileValidationError = useCallback(
    (error?: string) => {
      return preset(
        'fileValidationError',
        error
          ? {
              description: error
            }
          : {}
      )
    },
    [preset]
  )

  const filesProcessed = useCallback(
    (count?: number) => {
      return preset(
        'filesProcessed',
        count
          ? {
              description: `Successfully processed ${count} file(s)`
            }
          : {}
      )
    },
    [preset]
  )

  const fileProcessingFailed = useCallback(
    (filename?: string, error?: string) => {
      const description = filename && error ? `${filename}: ${error}` : error || filename
      return preset('fileProcessingFailed', description ? { description } : {})
    },
    [preset]
  )

  // Conversation operations convenience functions
  const conversationRenamed = useCallback(() => {
    return preset('conversationRenamed')
  }, [preset])

  const conversationRenameFailed = useCallback(
    (error?: string) => {
      return preset(
        'conversationRenameFailed',
        error
          ? {
              description: error
            }
          : {}
      )
    },
    [preset]
  )

  const conversationDeleted = useCallback(() => {
    return preset('conversationDeleted')
  }, [preset])

  const conversationDeleteFailed = useCallback(
    (error?: string) => {
      return preset(
        'conversationDeleteFailed',
        error
          ? {
              description: error
            }
          : {}
      )
    },
    [preset]
  )

  // Message edit operations convenience functions

  // Close all toasts
  const closeAll = useCallback(() => {
    toast.closeAll()
  }, [toast])

  return {
    // Generic functions
    notify,
    success,
    error,
    warning,
    info,
    preset,

    // Convenience functions
    messageCopied,
    messageRegenerated,
    messageError,
    aiGenerating,
    aiError,
    networkError,
    fileValidationError,
    filesProcessed,
    fileProcessingFailed,
    conversationRenamed,
    conversationRenameFailed,
    conversationDeleted,
    conversationDeleteFailed,

    // Utility functions
    closeAll
  }
}

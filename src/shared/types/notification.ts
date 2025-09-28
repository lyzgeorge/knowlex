export type NotificationType = 'success' | 'error' | 'warning' | 'info'

type NotificationPosition =
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

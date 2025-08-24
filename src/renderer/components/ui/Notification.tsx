import React, { createContext, useContext, ReactNode } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationOptions } from '@shared/types/notification'

// Context for notification functions
const NotificationContext = createContext<NotificationContextValue | null>(null)

// Enhanced provider props with default configuration
interface NotificationProviderProps {
  children: ReactNode
  /** Default position for all notifications */
  defaultPosition?: NotificationOptions['position']
  /** Default duration for all notifications */
  defaultDuration?: number
  /** Default variant for all notifications */
  defaultVariant?: string
}

// Enhanced context interface
interface NotificationContextValue extends ReturnType<typeof useNotifications> {
  defaultPosition?: NotificationOptions['position']
  defaultDuration?: number
  defaultVariant?: string
}

/**
 * Provider component that makes notification functions available throughout the app
 * Place this at the root level of your application
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  defaultPosition = 'bottom',
  defaultDuration = 3000,
  defaultVariant = 'solid'
}) => {
  const notifications = useNotifications()

  const contextValue: NotificationContextValue = {
    ...notifications,
    defaultPosition,
    defaultDuration,
    defaultVariant
  }

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  )
}

/**
 * Hook to access notification functions from any component
 * Must be used within a NotificationProvider
 */
export const useNotificationContext = (): NotificationContextValue => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}

// Set display names
NotificationProvider.displayName = 'NotificationProvider'

// Simplified export interface
export const Notification = {
  Provider: NotificationProvider,
  useContext: useNotificationContext
}

export default Notification

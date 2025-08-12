/**
 * Time formatting utilities for Knowlex Desktop Application
 * Provides human-friendly relative time formatting with internationalization support
 */

/**
 * Formats a timestamp to a human-readable relative time
 * @param timestamp - ISO string timestamp or Date
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffInMilliseconds = now.getTime() - date.getTime()
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  // Just now (less than 1 minute)
  if (diffInSeconds < 60) {
    return 'Just now'
  }

  // Minutes ago (1-59 minutes)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  // Hours ago (1-23 hours)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  // Today/Yesterday
  if (diffInDays === 1) {
    return 'Yesterday'
  }

  // Days ago (2-7 days)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  // More than a week - show formatted date
  return formatShortDate(date)
}

/**
 * Formats a date to a short date string (YYYY-MM-DD or MM/DD format)
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatShortDate(date: Date): string {
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()

  // If same year, show MM/DD format
  if (currentYear === dateYear) {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric'
    })
  }

  // Different year, show YYYY-MM-DD format
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Formats a timestamp to a full date and time string
 * @param timestamp - ISO string timestamp or Date
 * @returns Full formatted date and time
 */
export function formatFullDateTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formats a timestamp to just the time portion
 * @param timestamp - ISO string timestamp or Date
 * @returns Formatted time string (HH:MM AM/PM)
 */
export function formatTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Checks if a timestamp is from today
 * @param timestamp - ISO string timestamp or Date
 * @returns True if the timestamp is from today
 */
export function isToday(timestamp: string | Date): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const today = new Date()

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

/**
 * Checks if a timestamp is from yesterday
 * @param timestamp - ISO string timestamp or Date
 * @returns True if the timestamp is from yesterday
 */
export function isYesterday(timestamp: string | Date): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  )
}

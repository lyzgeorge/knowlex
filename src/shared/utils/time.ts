/**
 * Unified Time Management Utilities for Knowlex Desktop Application
 * Provides consistent time formatting with SQLite timestamp support and locale handling
 */

// Default locale for consistent formatting across the app
const DEFAULT_LOCALE = 'en-US'

// SQLite UTC timestamp pattern: "2025-08-20 12:34:56" (with optional milliseconds)
const SQLITE_UTC_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/

/**
 * Unified timestamp parser that handles Date objects, numbers, and SQLite UTC strings
 */
function parseTimestamp(input: string | number | Date): Date {
  if (input instanceof Date) return input
  if (typeof input === 'number') return new Date(input)

  const s = String(input)
  const m = SQLITE_UTC_RE.exec(s)
  if (m) {
    const [, y, mo, d, h, mi, s_, ms = '0'] = m
    if (!y || !mo || !d || !h || !mi || !s_) {
      return new Date() // fallback for malformed match
    }
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s_, +ms.padEnd(3, '0')))
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date() : d
}

// ============================================================================
// Core Formatting Functions (Unified Interface)
// ============================================================================

/**
 * Time-only formatter with flexible options
 */
export function formatTime(
  timestamp: Date | string | number,
  options: Intl.DateTimeFormatOptions & { locale?: string | string[] } = {}
) {
  const { locale = DEFAULT_LOCALE, ...timeOptions } = options
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...timeOptions
  }

  return new Intl.DateTimeFormat(locale, defaultOptions).format(parseTimestamp(timestamp))
}

// ============================================================================
// Relative Time Functions (Consolidated from both files)
// ============================================================================

/**
 * Formats a timestamp to a human-readable relative time
 * Consolidates logic from both shared and renderer utilities
 */
export function formatRelativeTime(timestamp: string | Date | number): string {
  const date = parseTimestamp(timestamp)
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

  // Yesterday
  if (diffInDays === 1) {
    return 'Yesterday'
  }

  // Days ago (2-7 days)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  // More than a week - show formatted date
  const currentYear = new Date().getFullYear()
  const dateYear = date.getFullYear()

  if (currentYear === dateYear) {
    return date.toLocaleDateString(DEFAULT_LOCALE, {
      month: 'numeric',
      day: 'numeric'
    })
  }

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

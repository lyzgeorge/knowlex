// Detect SQLite-style UTC timestamps like "2025-08-20 12:34:56" (optionally with milliseconds)
const SQLITE_UTC_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/

function parseTimestamp(input: string | number | Date): Date {
  if (input instanceof Date) return input
  if (typeof input === 'number') return new Date(input)

  const s = String(input)
  const m = SQLITE_UTC_RE.exec(s)
  if (m) {
    const [, y, mo, d, h, mi, s_, ms = '0'] = m
    // Ensure all captured groups are defined (they should be due to regex structure)
    if (!y || !mo || !d || !h || !mi || !s_) {
      return new Date() // fallback for invalid match
    }
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s_, +ms.padEnd(3, '0')))
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? new Date() : d
}

export const formatDateTime = (v: Date | string | number) => parseTimestamp(v).toLocaleString()

export const formatDate = (v: Date | string | number) => parseTimestamp(v).toLocaleDateString()

export function formatTime(
  v: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  },
  locale: string | string[] = 'en-US'
) {
  return new Intl.DateTimeFormat(locale, options).format(parseTimestamp(v))
}

export function getRelativeTime(v: Date | string | number): string {
  const d = parseTimestamp(v)
  const diff = Date.now() - d.getTime()

  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return formatDate(d)
}

export const getCurrentTimestamp = () => new Date().toISOString()

const aMinute = 60 * 1000
const anHour = 60 * aMinute
const aDay = 24 * anHour

export const formatTimestamp = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Handle future dates just in case
  if (diff < 0) {
    return 'in the future'
  }

  if (diff < aMinute) {
    return 'just now'
  }
  if (diff < anHour) {
    const minutes = Math.floor(diff / aMinute)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateDay.getTime() === today.getTime()) {
    const hours = Math.floor(diff / anHour)
    // If it's less than an hour, we'd have already returned.
    // So this will always be >= 1
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (dateDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  if (diff < aDay * 7) {
    const days = Math.floor(diff / aDay)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  // Format as YYYY-MM-DD
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

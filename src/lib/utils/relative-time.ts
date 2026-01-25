/**
 * Relative Time Utility
 * Converts timestamps to human-readable relative time strings in Spanish
 */

interface TimeUnit {
  unit: Intl.RelativeTimeFormatUnit
  seconds: number
}

const TIME_UNITS: TimeUnit[] = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
]

/**
 * Converts a timestamp to a relative time string in Spanish
 * @param timestamp - ISO string or Date object
 * @returns Relative time string (e.g., "hace 2 horas", "hace 3 días")
 */
export function getRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // If less than 30 seconds ago, show "ahora mismo"
  if (diffInSeconds < 30) {
    return 'ahora mismo'
  }

  // Use Intl.RelativeTimeFormat for proper localization
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

  for (const { unit, seconds } of TIME_UNITS) {
    if (diffInSeconds >= seconds) {
      const value = Math.floor(diffInSeconds / seconds)
      return rtf.format(-value, unit)
    }
  }

  return 'ahora mismo'
}

/**
 * Formats a timestamp for display with both relative and absolute time
 * @param timestamp - ISO string or Date object
 * @returns Object with relative and absolute time strings
 */
export function formatTimestamp(timestamp: string | Date): {
  relative: string
  absolute: string
} {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp

  return {
    relative: getRelativeTime(date),
    absolute: date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  }
}

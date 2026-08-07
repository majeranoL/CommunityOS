import { format, formatDistanceToNowStrict, isPast, isToday, isTomorrow } from 'date-fns'

export function formatDate(value: string | Date | null | undefined, pattern = 'MMM d, yyyy') {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return format(date, pattern)
}

export function formatDateTime(value: string | Date | null | undefined) {
  return formatDate(value, 'MMM d, yyyy h:mm a')
}

export function formatCurrency(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) return '—'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(numeric)
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-PH').format(value)
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

export function relativeDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return `${formatDate(date)} · ${relativeTime(date)}`
  return formatDate(date)
}

export function dayLabel(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  return format(date, 'EEEE, MMM d')
}

export function initials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || '?'
}

export function toTitleCase(value?: string | null) {
  if (!value) return ''
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

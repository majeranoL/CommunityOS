import type { HTMLAttributes } from 'react'
import { Badge, type BadgeProps } from '@/components/ui/badge'

const STATUS_VARIANTS: Record<string, BadgeProps['variant']> = {
  ACTIVE: 'success',
  ACTIVE_RECURRING: 'success',
  UPCOMING: 'info',
  DRAFT: 'secondary',
  SCHEDULED: 'info',
  OPEN: 'info',
  VOTING: 'info',
  IN_PROGRESS: 'info',
  PENDING: 'warning',
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  ASSIGNED: 'info',
  IN_REVIEW: 'warning',
  EXPIRED: 'muted',
  CLOSED: 'muted',
  COMPLETED: 'success',
  RESOLVED: 'success',
  CANCELLED: 'muted',
  REJECTED: 'destructive',
  OVERDUE: 'destructive',
  SUSPENDED: 'destructive',
  ARCHIVED: 'muted',
  INACTIVE: 'muted',
  DISABLED: 'muted',
  AVAILABLE: 'success',
  MAINTENANCE: 'warning',
  APPROVED: 'success',
}

export function StatusBadge({
  status,
  variant,
  ...props
}: { status: string; variant?: BadgeProps['variant'] } & HTMLAttributes<HTMLDivElement>) {
  const resolved = variant ?? STATUS_VARIANTS[status] ?? 'secondary'
  return (
    <Badge variant={resolved} {...props}>
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CalendarDays,
  CheckCheck,
  CircleDollarSign,
  FileText,
  Home,
  Info,
  Megaphone,
  MessageSquare,
  MessageSquareWarning,
  StickyNote,
  UserRound,
  Vote,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/shared/empty-state'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '@/features/notifications/hooks/use-notifications'
import type { AppNotification, NotificationType } from '@/features/notifications/types/notification'
import { notificationTarget } from '@/lib/notification-target'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  SYSTEM: { icon: Info, className: 'bg-info/10 text-info' },
  COMPLAINT: { icon: MessageSquareWarning, className: 'bg-warning/10 text-warning' },
  MAINTENANCE: { icon: AlertTriangle, className: 'bg-warning/10 text-warning' },
  PAYMENT: { icon: CircleDollarSign, className: 'bg-success/10 text-success' },
  ASSESSMENT: { icon: FileText, className: 'bg-info/10 text-info' },
  MESSAGE: { icon: MessageSquare, className: 'bg-primary/10 text-primary' },
  EVENT: { icon: CalendarDays, className: 'bg-primary/10 text-primary' },
  RESERVATION: { icon: Home, className: 'bg-info/10 text-info' },
  VISITOR: { icon: UserRound, className: 'bg-primary/10 text-primary' },
  ANNOUNCEMENT: { icon: Megaphone, className: 'bg-primary/10 text-primary' },
  POLL: { icon: Vote, className: 'bg-info/10 text-info' },
  VEHICLE_STICKER: { icon: StickyNote, className: 'bg-info/10 text-info' },
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const navigate = useNavigate()

  const { data, isLoading, isFetching } = useNotifications({ page, limit: 20, unreadOnly })
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const typeStyles = useMemo(() => TYPE_ICONS, [])

  const handleOpen = (notification: AppNotification) => {
    if (!notification.readAt) markRead.mutate(notification.id)
    const target = notificationTarget(notification.link)
    if (target) navigate(target)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay up to date with community activity."
      >
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
            Unread only
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || (data?.unreadCount ?? 0) === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : data?.items.length ? (
            <ul className="divide-y">
              {data.items.map((notification) => {
                const config = typeStyles[notification.type] ?? typeStyles.SYSTEM
                const Icon = config.icon
                const isUnread = !notification.readAt
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleOpen(notification)}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                        isUnread && 'bg-accent/30',
                      )}
                    >
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', config.className)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={cn('truncate text-sm', isUnread ? 'font-semibold' : 'font-medium text-muted-foreground')}>
                            {notification.title}
                          </p>
                          {isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                        </div>
                        {notification.message ? (
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {notification.type.replace(/_/g, ' ').toLowerCase()} · {relativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState
              icon={unreadOnly ? BellRing : Bell}
              title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              description={
                unreadOnly
                  ? 'You are all caught up.'
                  : 'Updates about your community will appear here.'
              }
            />
          )}
        </CardContent>
      </Card>

      {isFetching && !isLoading ? (
        <p className="text-xs text-muted-foreground">Updating…</p>
      ) : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />
    </div>
  )
}

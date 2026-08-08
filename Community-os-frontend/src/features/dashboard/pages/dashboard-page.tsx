import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  MessageSquareWarning,
  Megaphone,
  PenLine,
  Vote,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useDashboardOverview } from '@/features/dashboard/hooks/use-dashboard'
import { useAuthStore, useHasAnyPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatDateTime, relativeTime } from '@/lib/format'
import type { DashboardOverview } from '@/features/dashboard/types/dashboard'

function greet() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function KpiSkeleton() {
  return (
    <>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </>
  )
}

function RecentReservationsCard({ data }: { data?: DashboardOverview }) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Recent reservations</CardTitle>
        <Badge variant="secondary">{data?.recentReservations.length ?? 0}</Badge>
      </CardHeader>
      <CardContent>
        {data?.recentReservations.length ? (
          <ul className="divide-y">
            {data.recentReservations.map((reservation) => (
              <li key={reservation.id} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{reservation.facility.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {reservation.purpose ?? 'No purpose'} · {formatDateTime(reservation.startAt)}
                  </p>
                </div>
                <StatusBadge status={reservation.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No reservations" description="Reservations will appear here when submitted." />
        )}
        <button
          type="button"
          onClick={() => navigate('/app/facilities?tab=reservations')}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Manage reservations
          <ChevronRight className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}

function NeedsAttentionCard({
  counts,
  isLoading,
}: {
  counts?: DashboardOverview['counts']
  isLoading: boolean
}) {
  const navigate = useNavigate()

  const items = [
    {
      label: 'Pending reservations',
      value: counts?.pendingReservations,
      icon: Clock,
      href: '/app/facilities?tab=reservations',
      tone: 'text-primary',
    },
    {
      label: 'Draft announcements',
      value: counts?.draftAnnouncements,
      icon: PenLine,
      href: '/app/announcements',
      tone: 'text-primary',
    },
    {
      label: 'Open complaints',
      value: counts?.openComplaints,
      icon: MessageSquareWarning,
      href: '/app/complaints',
      tone: 'text-warning',
    },
    {
      label: 'Pending payments',
      value: counts?.pendingPayments,
      icon: FileText,
      href: '/app/users',
      tone: 'text-primary',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.href)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent"
              >
                <Icon className={`h-5 w-5 shrink-0 ${item.tone}`} />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                <Badge variant="secondary">{item.value ?? 0}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function UpcomingEventsCard({ data, isLoading }: { data?: DashboardOverview; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Upcoming events</CardTitle>
        <Badge variant="secondary">{data?.upcomingEvents.length ?? 0}</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data?.upcomingEvents.length ? (
          <ul className="divide-y">
            {data.upcomingEvents.map((event) => (
              <li key={event.id} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {formatDate(event.startAt, 'MMM d · h:mm a')}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No upcoming events" description="Events will appear here when published." />
        )}
      </CardContent>
    </Card>
  )
}

function OpenComplaintsCard({ data, isLoading }: { data?: DashboardOverview; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Open complaints</CardTitle>
        <Badge variant="warning">{data?.recentComplaints.length ?? 0}</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : data?.recentComplaints.length ? (
          <ul className="divide-y">
            {data.recentComplaints.map((complaint) => (
              <li key={complaint.id} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  <ClipboardList className="h-5 w-5 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{complaint.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {complaint.complaintNumber} · {relativeTime(complaint.createdAt)}
                  </p>
                </div>
                <StatusBadge status={complaint.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No open complaints" description="You're all caught up." />
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const isManagement = useHasAnyPermission([
    PERMISSIONS.reservationApprove,
    PERMISSIONS.announcementCreate,
  ])
  const { data, isLoading } = useDashboardOverview()
  const navigate = useNavigate()

  const counts = data?.counts
  const availableFacilities = data?.facilityStatus.AVAILABLE ?? 0

  const quickActions = [
    { label: 'Announcements', icon: Megaphone, href: '/app/announcements', permission: PERMISSIONS.announcementView },
    { label: 'Events', icon: CalendarDays, href: '/app/events', permission: PERMISSIONS.eventView },
    { label: 'Polls', icon: Vote, href: '/app/polls', permission: PERMISSIONS.pollView },
    { label: 'Complaints', icon: MessageSquareWarning, href: '/app/complaints', permission: PERMISSIONS.complaintView },
    { label: 'Facilities', icon: Building2, href: '/app/facilities', permission: PERMISSIONS.facilityView },
  ].filter((action) => user?.permissions.includes(action.permission))

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greet()}, ${user?.firstName ?? ''}!`}
        description={`Here's what's happening in ${user?.community.displayName ?? 'your community'}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <KpiSkeleton />
        ) : isManagement ? (
          <>
            <KpiCard label="Pending reservations" value={counts?.pendingReservations} icon={Clock} />
            <KpiCard label="Draft announcements" value={counts?.draftAnnouncements} icon={PenLine} />
            <KpiCard label="Open complaints" value={counts?.openComplaints} icon={MessageSquareWarning} />
            <KpiCard label="Available facilities" value={availableFacilities} icon={Building2} />
          </>
        ) : (
          <>
            <KpiCard label="Available facilities" value={availableFacilities} icon={Building2} />
            <KpiCard label="Upcoming events" value={data?.upcomingEvents.length} icon={CalendarDays} />
            <KpiCard label="Announcements" value={counts?.announcements} icon={Megaphone} />
            <KpiCard label="Open complaints" value={counts?.openComplaints} icon={MessageSquareWarning} />
          </>
        )}
      </div>

      {quickActions.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.href}
                type="button"
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-5 w-5 text-primary" />
                {action.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {isManagement ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <NeedsAttentionCard counts={counts} isLoading={isLoading} />
          </div>
          <div className="lg:col-span-2">
            <RecentReservationsCard data={data} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingEventsCard data={data} isLoading={isLoading} />
        <OpenComplaintsCard data={data} isLoading={isLoading} />
      </div>

      {user?.resident ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Welcome home.</span> Use the shortcuts above to report an
          issue, book a facility, or join an event.
        </div>
      ) : null}
    </div>
  )
}

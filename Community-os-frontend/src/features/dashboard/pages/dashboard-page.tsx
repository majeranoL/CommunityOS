import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  MessageSquareWarning,
  Megaphone,
  PenLine,
  TrendingUp,
  AlertCircle,
  Vote,
  Building2,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useDashboardOverview } from '@/features/dashboard/hooks/use-dashboard'
import { useAuthStore, useHasAnyPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatDate, formatDateTime, relativeTime, toTitleCase } from '@/lib/format'
import { useFacilities } from '@/features/facilities/hooks/use-facilities'
import { AnnouncementDetailDialog } from '@/features/announcements/components/announcement-detail-dialog'
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSkeleton />
      </div>
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <div className="lg:col-span-2">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
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

function AnnouncementsCarousel({
  data,
  isLoading,
  onOpenAnnouncement,
}: {
  data?: DashboardOverview
  isLoading: boolean
  onOpenAnnouncement: (id: string) => void
}) {
  const navigate = useNavigate()
  const announcements = data?.recentAnnouncements ?? []
  const count = announcements.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (count <= 1 || paused) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), 6000)
    return () => clearInterval(timer)
  }, [count, paused])

  const safeIndex = count > 0 ? index % count : 0
  const active = announcements[safeIndex] ?? announcements[0]

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Announcements
        </CardTitle>
        <Badge variant="secondary">{count}</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : count ? (
          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="space-y-3"
          >
            <button
              type="button"
              onClick={() => onOpenAnnouncement(active.id)}
              className="block w-full rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {active.coverImageUrl?.startsWith('http') ? (
                  <img
                    src={active.coverImageUrl}
                    alt=""
                    className="h-24 w-full rounded-lg object-cover sm:h-28 sm:w-44"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Megaphone className="h-3.5 w-3.5" />
                    {active.publishedAt
                      ? `Published ${relativeTime(active.publishedAt)}`
                      : `Posted ${relativeTime(active.createdAt)}`}
                  </p>
                  <h3 className="text-base font-semibold leading-snug">{active.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{active.content}</p>
                </div>
              </div>
            </button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {announcements.map((announcement, i) => (
                  <button
                    key={announcement.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to announcement ${i + 1}`}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      i === safeIndex ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIndex((current) => (current - 1 + count) % count)}
                  aria-label="Previous announcement"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIndex((current) => (current + 1) % count)}
                  aria-label="Next announcement"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/announcements')}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all announcements
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <EmptyState
            title="No announcements yet"
            description="Published announcements will appear here."
          />
        )}
      </CardContent>
    </Card>
  )
}

function FacilitiesUnderMaintenanceCard() {
  const navigate = useNavigate()
  const { data, isLoading } = useFacilities({ status: 'MAINTENANCE', limit: 100 })
  const items = data?.items ?? []

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Under maintenance</CardTitle>
        <Badge variant="warning">{items.length}</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length ? (
          <ul className="divide-y">
            {items.map((facility) => (
              <li key={facility.id} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10">
                  <Wrench className="h-5 w-5 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{facility.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {toTitleCase(facility.type)}
                    {facility.location ? ` · ${facility.location}` : ''}
                  </p>
                </div>
                <StatusBadge status={facility.status} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No facilities under maintenance"
            description="All facilities are available for use."
          />
        )}
        <button
          type="button"
          onClick={() => navigate('/app/facilities')}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all facilities
          <ChevronRight className="h-4 w-4" />
        </button>
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
  const [announcementId, setAnnouncementId] = useState<string | null>(null)

  const counts = data?.counts
  const availableFacilities = data?.facilityStatus.AVAILABLE ?? 0
  const canViewAnnouncements = user?.permissions.includes(PERMISSIONS.announcementView) ?? false
  const canViewFacilities = user?.permissions.includes(PERMISSIONS.facilityView) ?? false

  const quickActions = [
    { label: 'Announcements', icon: Megaphone, href: '/app/announcements', permission: PERMISSIONS.announcementView },
    { label: 'Events', icon: CalendarDays, href: '/app/events', permission: PERMISSIONS.eventView },
    { label: 'Polls', icon: Vote, href: '/app/polls', permission: PERMISSIONS.pollView },
    { label: 'Complaints', icon: MessageSquareWarning, href: '/app/complaints', permission: PERMISSIONS.complaintView },
    { label: 'Facilities', icon: Building2, href: '/app/facilities', permission: PERMISSIONS.facilityView },
  ].filter((action) => user?.permissions.includes(action.permission))

  return (
    <div className="space-y-6">
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <PageHeader
            title={`${greet()}, ${user?.firstName ?? ''}!`}
            description={`Here's what's happening in ${user?.community.displayName ?? 'your community'}.`}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {isManagement ? (
              <>
                <div className="animate-card-enter" style={{ animationDelay: '0ms' }}>
                  <KpiCard label="Pending reservations" value={counts?.pendingReservations} icon={Clock} />
                </div>
                <div className="animate-card-enter" style={{ animationDelay: '50ms' }}>
                  <KpiCard label="Draft announcements" value={counts?.draftAnnouncements} icon={PenLine} />
                </div>
                <div className="animate-card-enter" style={{ animationDelay: '100ms' }}>
                  <KpiCard label="Open complaints" value={counts?.openComplaints} icon={MessageSquareWarning} />
                </div>
                <div className="animate-card-enter" style={{ animationDelay: '150ms' }}>
                  <KpiCard label="Available facilities" value={availableFacilities} icon={Building2} />
                </div>
              </>
            ) : (
              <>
                <div className="animate-card-enter" style={{ animationDelay: '0ms' }}>
                  <KpiCard label="Available facilities" value={availableFacilities} icon={Building2} />
                </div>
                <div className="animate-card-enter" style={{ animationDelay: '50ms' }}>
                  <KpiCard label="Upcoming events" value={data?.upcomingEvents.length} icon={CalendarDays} />
                </div>
                <div className="animate-card-enter" style={{ animationDelay: '100ms' }}>
                  <KpiCard label="Announcements" value={counts?.announcements} icon={Megaphone} />
                </div>
                <div className="animate-card-enter" style={{ animationDelay: '150ms' }}>
                  <KpiCard label="Open complaints" value={counts?.openComplaints} icon={MessageSquareWarning} />
                </div>
              </>
            )}
          </div>

          {isManagement && data?.finance ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="animate-card-enter" style={{ animationDelay: '200ms' }}>
                <KpiCard label="Total billed" value={data.finance.totalBilled} icon={FileText} hint="All assessments issued" />
              </div>
              <div className="animate-card-enter" style={{ animationDelay: '250ms' }}>
                <KpiCard label="Total collected" value={data.finance.totalCollected} icon={DollarSign} hint="Verified payments" />
              </div>
              <div className="animate-card-enter" style={{ animationDelay: '300ms' }}>
                <KpiCard label="Outstanding" value={data.finance.outstanding} icon={AlertCircle} hint="Unpaid balance" />
              </div>
              <div className="animate-card-enter" style={{ animationDelay: '350ms' }}>
                <KpiCard label="This month" value={data.finance.monthlyCollected} icon={TrendingUp} hint={`${data.finance.monthlyPaymentsCount} payment(s)`} />
              </div>
            </div>
          ) : null}

          {canViewAnnouncements ? (
            <div className="animate-card-enter" style={{ animationDelay: '400ms' }}>
              <AnnouncementsCarousel
                data={data}
                isLoading={isLoading}
                onOpenAnnouncement={setAnnouncementId}
              />
            </div>
          ) : null}

          {quickActions.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.href}
                    type="button"
                    onClick={() => navigate(action.href)}
                    className="animate-card-enter flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    style={{ animationDelay: `${450 + index * 50}ms` }}
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
              <div className="animate-card-enter space-y-6 lg:col-span-1" style={{ animationDelay: '700ms' }}>
                <NeedsAttentionCard counts={counts} isLoading={isLoading} />
              </div>
              <div className="animate-card-enter lg:col-span-2" style={{ animationDelay: '750ms' }}>
                <RecentReservationsCard data={data} />
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="animate-card-enter" style={{ animationDelay: '800ms' }}>
              <UpcomingEventsCard data={data} isLoading={isLoading} />
            </div>
            <div className="animate-card-enter" style={{ animationDelay: '850ms' }}>
              <OpenComplaintsCard data={data} isLoading={isLoading} />
            </div>
            {canViewFacilities ? (
              <div className="animate-card-enter" style={{ animationDelay: '900ms' }}>
                <FacilitiesUnderMaintenanceCard />
              </div>
            ) : null}
          </div>

          <AnnouncementDetailDialog
            announcementId={announcementId}
            open={Boolean(announcementId)}
            onOpenChange={(open) => {
              if (!open) setAnnouncementId(null)
            }}
          />

          {user?.resident ? (
            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Welcome home.</span> Use the shortcuts above to report an
              issue, book a facility, or join an event.
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

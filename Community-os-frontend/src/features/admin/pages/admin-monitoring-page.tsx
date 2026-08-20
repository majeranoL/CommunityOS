import {
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  HardDrive,
  MemoryStick,
  MessageSquare,
  Users,
  UserCheck,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useSystemHealth, usePlatformStats } from '@/features/admin/hooks/use-admin'

function StatusDot({ status }: { status: 'healthy' | 'degraded' | 'up' | 'down' }) {
  const color =
    status === 'healthy' || status === 'up'
      ? 'bg-emerald-500'
      : 'bg-red-500'
  return (
    <span className="relative flex h-3 w-3">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`} />
      <span className={`relative inline-flex h-3 w-3 rounded-full ${color}`} />
    </span>
  )
}

function formatBytes(mb: number): string {
  return `${mb} MB`
}

export default function AdminMonitoringPage() {
  const { data: health, isLoading: healthLoading } = useSystemHealth()
  const { data: stats, isLoading: statsLoading } = usePlatformStats()

  return (
    <div className="space-y-6">
      <PageHeader
        title="System health"
        description="Platform monitoring — database, memory, uptime, and key metrics."
      />

      {/* System Health Status */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {healthLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <StatusDot status={health?.status ?? 'degraded'} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{health?.status ?? '—'}</div>
                <p className="text-xs text-muted-foreground">
                  {health?.database.status === 'up' ? 'Database connected' : 'Database unreachable'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">DB Latency</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health?.database.latencyMs ?? '—'} ms</div>
                <p className="text-xs text-muted-foreground">
                  {health?.database.status === 'up' ? 'Connection healthy' : 'Connection failed'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health?.uptime.human ?? '—'}</div>
                <p className="text-xs text-muted-foreground">PID {health?.process.pid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Heap Memory</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatBytes(health?.memory.heapUsedMb ?? 0)}</div>
                <p className="text-xs text-muted-foreground">
                  of {formatBytes(health?.memory.heapTotalMb ?? 0)} allocated
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Process & Environment */}
      {health ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Process details</CardTitle>
            <CardDescription>Runtime environment of the backend service</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground">Node.js</p>
                <p className="font-medium">{health.process.nodeVersion}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Platform</p>
                <p className="font-medium">{health.process.platform}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Architecture</p>
                <p className="font-medium">{health.process.arch}</p>
              </div>
              <div>
                <p className="text-muted-foreground">RSS Memory</p>
                <p className="font-medium">{formatBytes(health.memory.rssMb)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Platform Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Communities" value={stats?.communities.total} icon={Building2} loading={statsLoading} />
        <KpiCard label="Active communities" value={stats?.communities.active} icon={CheckCircle2} loading={statsLoading} />
        <KpiCard label="Total users" value={stats?.users.total} icon={Users} loading={statsLoading} />
        <KpiCard label="Active users (30d)" value={stats?.users.activeLast30Days} icon={UserCheck} loading={statsLoading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Residents" value={stats?.residents.total} icon={Users} loading={statsLoading} />
        <KpiCard label="Households" value={stats?.households.total} icon={HardDrive} loading={statsLoading} />
        <KpiCard label="Open complaints" value={stats?.complaints.open} icon={AlertTriangle} loading={statsLoading} />
        <KpiCard label="Checked-in visitors" value={stats?.visitors.currentlyCheckedIn} icon={UserCheck} loading={statsLoading} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total complaints" value={stats?.complaints.total} icon={AlertTriangle} loading={statsLoading} />
        <KpiCard label="Total visitors" value={stats?.visitors.total} icon={UserCheck} loading={statsLoading} />
        <KpiCard label="Unread notifications" value={stats?.notifications.unread} icon={MessageSquare} loading={statsLoading} />
        <KpiCard label="Audit logs (7d)" value={stats?.auditLogs.last7Days} icon={FileText} loading={statsLoading} />
      </div>
    </div>
  )
}

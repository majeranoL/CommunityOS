import { useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuditLogs, useAuditSummary } from '@/features/audit-logs/hooks/use-audit-logs'
import { PurgeAuditLogsDialog } from '@/features/audit-logs/components/purge-audit-logs-dialog'
import type { AuditLogListItem } from '@/features/audit-logs/types/audit-log'
import { cn } from '@/lib/utils'
import { formatDateTime, toTitleCase } from '@/lib/format'

const FALLBACK_ACTIONS = ['POST', 'PUT', 'PATCH', 'DELETE']

function SummaryCard({
  label,
  value,
  tone,
  loading,
}: {
  label: string
  value?: number
  tone: string
  loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-12" />
        ) : (
          <p className={cn('mt-1 text-2xl font-semibold tracking-tight', tone)}>
            {value?.toLocaleString() ?? '—'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('ALL')
  const [entity, setEntity] = useState<string>('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [purgeOpen, setPurgeOpen] = useState(false)

  const canManage = useHasPermission(PERMISSIONS.auditManage)

  const { data, isLoading, isFetching } = useAuditLogs({
    page,
    limit: 10,
    search: search || undefined,
    action: action === 'ALL' ? undefined : action,
    entity: entity === 'ALL' ? undefined : entity,
    from: from || undefined,
    to: to || undefined,
  })

  const { data: summary, isLoading: summaryLoading } = useAuditSummary()

  const actionOptions = Array.from(
    new Set([
      ...(summary?.byAction.map((row) => row.action) ?? []),
      ...FALLBACK_ACTIONS,
    ]),
  )

  const entityOptions = (summary?.byEntity ?? []).sort((a, b) => b.count - a.count)

  const countFor = (actionName: string) =>
    summary?.byAction.find((row) => row.action === actionName)?.count ?? 0

  const columns: Column<AuditLogListItem>[] = [
    {
      key: 'time',
      header: 'When',
      cell: (row) => (
        <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      cell: (row) => (
        <span className="font-medium">
          {row.actor ? `${row.actor.firstName} ${row.actor.lastName}` : 'System'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => <StatusBadge status={row.action} />,
    },
    {
      key: 'entity',
      header: 'Entity',
      cell: (row) => <span className="capitalize">{toTitleCase(row.entity)}</span>,
    },
    {
      key: 'entityId',
      header: 'Entity ID',
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.entityId ?? '—'}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'ip',
      header: 'IP',
      cell: (row) => <span className="text-xs text-muted-foreground">{row.ipAddress ?? '—'}</span>,
      hideBelow: 'lg',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Record of every mutating request in the community.">
        {canManage ? (
          <Button variant="destructive" onClick={() => setPurgeOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Purge
          </Button>
        ) : null}
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <SummaryCard
          label="Total entries"
          value={summary?.total}
          tone="text-foreground"
          loading={summaryLoading}
        />
        {FALLBACK_ACTIONS.map((actionName) => (
          <SummaryCard
            key={actionName}
            label={toTitleCase(actionName)}
            value={countFor(actionName)}
            tone="text-muted-foreground"
            loading={summaryLoading}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entity, action…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={action}
          onValueChange={(value) => {
            setAction(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="lg:w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All actions</SelectItem>
            {actionOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={entity}
          onValueChange={(value) => {
            setEntity(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="lg:w-44">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All entities</SelectItem>
            {entityOptions.map((option) => (
              <SelectItem key={option.entity} value={option.entity}>
                {toTitleCase(option.entity)} ({option.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="lg:w-40"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPage(1)
            }}
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="lg:w-40"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPage(1)
            }}
            aria-label="To date"
          />
        </div>
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No audit logs found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <PurgeAuditLogsDialog open={purgeOpen} onOpenChange={setPurgeOpen} />
    </div>
  )
}

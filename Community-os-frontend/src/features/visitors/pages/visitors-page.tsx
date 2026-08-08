import { useState } from 'react'
import { LogIn, LogOut, Plus, Search, UserRoundX, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import {
  useCancelVisitor,
  useCheckInVisitor,
  useCheckOutVisitor,
  useVisitors,
} from '@/features/visitors/hooks/use-visitors'
import { VisitorFormDialog } from '@/features/visitors/components/visitor-form-dialog'
import type { VisitorListItem } from '@/features/visitors/types/visitor'
import { formatDateTime, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'] as const

export default function VisitorsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)

  const canCreate = useHasPermission(PERMISSIONS.visitorCreate)
  const canCheckIn = useHasPermission(PERMISSIONS.visitorCheckIn)
  const canCheckOut = useHasPermission(PERMISSIONS.visitorCheckOut)
  const canCancel = useHasPermission(PERMISSIONS.visitorCancel)

  const { data, isLoading, isFetching } = useVisitors({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const checkIn = useCheckInVisitor()
  const checkOut = useCheckOutVisitor()
  const cancelVisit = useCancelVisitor()

  const hostName = (row: VisitorListItem) =>
    row.hostResident ? `${row.hostResident.firstName} ${row.hostResident.lastName}` : null

  const columns: Column<VisitorListItem>[] = [
    {
      key: 'visitor',
      header: 'Visitor',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.phoneNumber || row.purpose || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'host',
      header: 'Visiting',
      cell: (row) => <span className="text-muted-foreground">{hostName(row) || '—'}</span>,
      hideBelow: 'md',
    },
    {
      key: 'timing',
      header: 'Entry / Exit',
      cell: (row) => (
        <div className="leading-tight">
          <p className="text-muted-foreground">{row.entryAt ? formatDateTime(row.entryAt) : '—'}</p>
          <p className="text-xs text-muted-foreground">
            {row.exitAt ? formatDateTime(row.exitAt) : ''}
          </p>
        </div>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'EXPECTED' && canCheckIn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => checkIn.mutate(row.id)}
              disabled={checkIn.isPending}
            >
              <LogIn className="h-4 w-4" />
              Check in
            </Button>
          ) : null}
          {row.status === 'CHECKED_IN' && canCheckOut ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => checkOut.mutate(row.id)}
              disabled={checkOut.isPending}
            >
              <LogOut className="h-4 w-4" />
              Check out
            </Button>
          ) : null}
          {(row.status === 'EXPECTED' || row.status === 'CHECKED_IN') && canCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (window.confirm(`Cancel visit for ${row.name}?`)) cancelVisit.mutate(row.id)
              }}
              disabled={cancelVisit.isPending}
            >
              <UserRoundX className="h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description="Gate log — expected visits, check-ins, and check-outs."
      >
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add visitor
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search visitor or host…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All statuses' : toTitleCase(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No visitors found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <VisitorFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}

import { useState } from 'react'
import { Plus, Search, Wrench } from 'lucide-react'
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
import { useMaintenanceList } from '@/features/maintenance/hooks/use-maintenance'
import { MaintenanceFormDialog } from '@/features/maintenance/components/maintenance-form-dialog'
import { MaintenanceDetailsDialog } from '@/features/maintenance/components/maintenance-details-dialog'
import type { MaintenanceListItem } from '@/features/maintenance/types/maintenance'
import { formatDate, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = [
  'ALL',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CANCELLED',
] as const
const PRIORITY_FILTERS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export default function MaintenancePage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [priority, setPriority] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editMaintenance, setEditMaintenance] = useState<MaintenanceListItem | null>(null)
  const [detailsMaintenance, setDetailsMaintenance] = useState<MaintenanceListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.maintenanceCreate)
  const canUpdate = useHasPermission(PERMISSIONS.maintenanceUpdate)

  const { data, isLoading, isFetching } = useMaintenanceList({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    priority: priority === 'ALL' ? undefined : priority,
  })

  const columns: Column<MaintenanceListItem>[] = [
    {
      key: 'title',
      header: 'Request',
      cell: (row) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => setDetailsMaintenance(row)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.maintenanceNumber}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'facility',
      header: 'Facility',
      cell: (row) => (
        <span className="text-muted-foreground">{row.facility?.name || '—'}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'assignedTo',
      header: 'Assigned',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.assignedTo ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}` : '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => <span className="text-muted-foreground">{toTitleCase(row.priority)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
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
      cell: (row) =>
        canUpdate ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditMaintenance(row)}
          >
            Edit
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description="Repair and upkeep requests across the community."
      >
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New request
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search requests…"
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
          <SelectTrigger className="sm:w-44">
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
        <Select
          value={priority}
          onValueChange={(value) => {
            setPriority(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All priorities' : toTitleCase(option)}
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
        emptyMessage="No maintenance requests found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <MaintenanceFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <MaintenanceFormDialog
        open={Boolean(editMaintenance)}
        onOpenChange={(open) => !open && setEditMaintenance(null)}
        maintenance={editMaintenance}
      />
      {detailsMaintenance ? (
        <MaintenanceDetailsDialog
          maintenance={detailsMaintenance}
          open
          onOpenChange={(open) => !open && setDetailsMaintenance(null)}
          onEdit={() => setEditMaintenance(detailsMaintenance)}
        />
      ) : null}
    </div>
  )
}

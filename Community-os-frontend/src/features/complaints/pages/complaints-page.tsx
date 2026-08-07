import { useState } from 'react'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission, useAuthStore } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useComplaints, useDeleteComplaint } from '@/features/complaints/hooks/use-complaints'
import { ComplaintFormDialog } from '@/features/complaints/components/complaint-form-dialog'
import { ComplaintDetailDialog } from '@/features/complaints/components/complaint-detail-dialog'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from '@/features/complaints/validation/complaint'
import type { ComplaintListItem } from '@/features/complaints/types/complaint'
import { Switch } from '@/components/ui/switch'
import { formatDate } from '@/lib/format'
import { useViewParam } from '@/lib/use-view-param'

const STATUS_FILTERS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

export default function ComplaintsPage() {
  const user = useAuthStore((state) => state.user)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [priority, setPriority] = useState<string>('ALL')
  const [myOnly, setMyOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ComplaintListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.complaintCreate)
  const canDelete = useHasPermission(PERMISSIONS.complaintDelete)
  const myResidentId = user?.resident?.id

  const { data, isLoading, isFetching } = useComplaints({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    priority: priority === 'ALL' ? undefined : priority,
    residentId: myOnly ? myResidentId : undefined,
  })

  const deleteComplaint = useDeleteComplaint()

  useViewParam((id) => setDetailId(id))

  const columns: Column<ComplaintListItem>[] = [
    {
      key: 'title',
      header: 'Complaint',
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setDetailId(row.id)}>
          <p className="font-medium hover:underline">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.complaintNumber}</p>
        </button>
      ),
    },
    {
      key: 'resident',
      header: 'Reporter',
      cell: (row) => <span className="text-muted-foreground">{row.resident.fullName}</span>,
      hideBelow: 'md',
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => <Badge variant="secondary">{optionLabel(CATEGORY_OPTIONS, row.category)}</Badge>,
      hideBelow: 'lg',
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => (
        <Badge
          variant={
            row.priority === 'URGENT' || row.priority === 'HIGH'
              ? 'destructive'
              : row.priority === 'MEDIUM'
                ? 'warning'
                : 'muted'
          }
        >
          {optionLabel(PRIORITY_OPTIONS, row.priority)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Filed',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
      hideBelow: 'md',
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailId(row.id)}>View</DropdownMenuItem>
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(row)}>
                  Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        description="Track and resolve issues reported by residents."
      >
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New complaint
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search complaints…"
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
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL'
                  ? 'All statuses'
                  : option === 'IN_PROGRESS'
                    ? 'In progress'
                    : option.charAt(0) + option.slice(1).toLowerCase()}
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
            <SelectItem value="ALL">All priorities</SelectItem>
            {PRIORITY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {myResidentId ? (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch
              checked={myOnly}
              onCheckedChange={(value) => {
                setMyOnly(value)
                setPage(1)
              }}
            />
            My complaints
          </label>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No complaints found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ComplaintFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ComplaintDetailDialog
        complaintId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete complaint?"
        description={`"${deleting?.title}" will be permanently removed from the record.`}
        confirmLabel="Delete"
        destructive
        loading={deleteComplaint.isPending}
        onConfirm={() => {
          if (deleting) deleteComplaint.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

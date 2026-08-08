import { useState } from 'react'
import { CheckCircle2, MoreHorizontal, Plus, Search, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import {
  useCancelEvent,
  useCompleteEvent,
  useDeleteEvent,
  useEvents,
  usePublishEvent,
} from '@/features/events/hooks/use-events'
import { EventFormDialog } from '@/features/events/components/event-form-dialog'
import { EventDetailDialog } from '@/features/events/components/event-detail-dialog'
import type { CommunityEvent } from '@/features/events/types/event'
import { formatDate } from '@/lib/format'
import { useViewParam } from '@/lib/use-view-param'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'UPCOMING', 'PUBLISHED', 'COMPLETED', 'CANCELLED'] as const

export default function EventsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CommunityEvent | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CommunityEvent | null>(null)
  const [cancelling, setCancelling] = useState<CommunityEvent | null>(null)
  const [completing, setCompleting] = useState<CommunityEvent | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.eventCreate)
  const canUpdate = useHasPermission(PERMISSIONS.eventUpdate)
  const canDelete = useHasPermission(PERMISSIONS.eventDelete)
  const canPublish = useHasPermission(PERMISSIONS.eventPublish)
  const canCancel = useHasPermission(PERMISSIONS.eventCancel)
  const canComplete = useHasPermission(PERMISSIONS.eventComplete)

  const { data, isLoading, isFetching } = useEvents({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const publishEvent = usePublishEvent()
  const cancelEvent = useCancelEvent()

  useViewParam((id) => setDetailId(id))
  const completeEvent = useCompleteEvent()
  const deleteEvent = useDeleteEvent()

  const columns: Column<CommunityEvent>[] = [
    {
      key: 'title',
      header: 'Event',
      cell: (row) => (
        <button
          type="button"
          className="text-left"
          onClick={() => setDetailId(row.id)}
        >
          <p className="font-medium hover:underline">{row.title}</p>
          {row.location ? <p className="text-xs text-muted-foreground">{row.location}</p> : null}
        </button>
      ),
    },
    {
      key: 'startAt',
      header: 'Starts',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.startAt)}</span>,
      hideBelow: 'md',
    },
    {
      key: 'organizer',
      header: 'Organizer',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.organizer ? `${row.organizer.firstName} ${row.organizer.lastName}` : '—'}
        </span>
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
            {row.status === 'DRAFT' && canPublish ? (
              <DropdownMenuItem onClick={() => publishEvent.mutate(row.id)} disabled={publishEvent.isPending}>
                Publish
              </DropdownMenuItem>
            ) : null}
            {row.status !== 'CANCELLED' && row.status !== 'COMPLETED' && canUpdate ? (
              <DropdownMenuItem onClick={() => setEditing(row)}>Edit</DropdownMenuItem>
            ) : null}
            {row.status !== 'CANCELLED' && row.status !== 'COMPLETED' && canComplete ? (
              <DropdownMenuItem onClick={() => setCompleting(row)}>
                <CheckCircle2 className="h-4 w-4" />
                Mark completed
              </DropdownMenuItem>
            ) : null}
            {row.status !== 'CANCELLED' && row.status !== 'COMPLETED' && canCancel ? (
              <DropdownMenuItem className="text-warning focus:text-warning" onClick={() => setCancelling(row)}>
                <XCircle className="h-4 w-4" />
                Cancel event
              </DropdownMenuItem>
            ) : null}
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
        title="Events"
        description="Organize community events and keep residents in the loop."
      >
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            New event
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events…"
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
                {option === 'ALL' ? 'All statuses' : option.charAt(0) + option.slice(1).toLowerCase()}
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
        emptyMessage="No events found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} />
      <EventDetailDialog
        eventId={detailId}
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
        title="Delete event?"
        description={`"${deleting?.title}" will be permanently hidden. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteEvent.isPending}
        onConfirm={() => {
          if (deleting) deleteEvent.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) setCancelling(null)
        }}
        title="Cancel this event?"
        description={`"${cancelling?.title}" will be marked as cancelled and removed from the schedule.`}
        confirmLabel="Cancel event"
        loading={cancelEvent.isPending}
        onConfirm={() => {
          if (cancelling) cancelEvent.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })
        }}
      />
      <ConfirmDialog
        open={Boolean(completing)}
        onOpenChange={(open) => {
          if (!open) setCompleting(null)
        }}
        title="Mark event as completed?"
        description={`"${completing?.title}" will be moved to the completed list.`}
        confirmLabel="Mark completed"
        loading={completeEvent.isPending}
        onConfirm={() => {
          if (completing) completeEvent.mutate(completing.id, { onSuccess: () => setCompleting(null) })
        }}
      />
    </div>
  )
}

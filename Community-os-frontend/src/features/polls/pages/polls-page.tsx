import { useState } from 'react'
import { Lock, MoreHorizontal, Plus, Search, Unlock } from 'lucide-react'
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
  useClosePoll,
  useDeletePoll,
  usePolls,
  usePublishPoll,
} from '@/features/polls/hooks/use-polls'
import { PollFormDialog } from '@/features/polls/components/poll-form-dialog'
import { PollDetailDialog } from '@/features/polls/components/poll-detail-dialog'
import type { PollListItem } from '@/features/polls/types/poll'
import { formatDate } from '@/lib/format'
import { useViewParam } from '@/lib/use-view-param'

const STATUS_FILTERS = ['ALL', 'OPEN', 'DRAFT', 'CLOSED'] as const

export default function PollsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PollListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PollListItem | null>(null)
  const [closing, setClosing] = useState<PollListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.pollCreate)
  const canUpdate = useHasPermission(PERMISSIONS.pollUpdate)
  const canClose = useHasPermission(PERMISSIONS.pollClose)
  const canDelete = useHasPermission(PERMISSIONS.pollDelete)
  const canVote = useHasPermission(PERMISSIONS.pollVote)

  const { data, isLoading, isFetching } = usePolls({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const publishPoll = usePublishPoll()
  const closePoll = useClosePoll()
  const deletePoll = useDeletePoll()

  useViewParam((id) => setDetailId(id))

  const columns: Column<PollListItem>[] = [
    {
      key: 'title',
      header: 'Poll',
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setDetailId(row.id)}>
          <p className="font-medium hover:underline">{row.title}</p>
          <p className="text-xs text-muted-foreground">
            {row._count.votes} votes · {row.options.length} options
          </p>
        </button>
      ),
    },
    {
      key: 'endAt',
      header: 'Voting ends',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.endAt ? formatDate(row.endAt) : '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdBy',
      header: 'Created by',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.createdBy.firstName} {row.createdBy.lastName}
        </span>
      ),
      hideBelow: 'lg',
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
            <DropdownMenuItem onClick={() => setDetailId(row.id)}>
              {canVote && row.status === 'OPEN' ? 'Vote / view' : 'View'}
            </DropdownMenuItem>
            {row.status === 'DRAFT' && canCreate ? (
              <DropdownMenuItem onClick={() => publishPoll.mutate(row.id)} disabled={publishPoll.isPending}>
                <Unlock className="h-4 w-4" />
                Open for voting
              </DropdownMenuItem>
            ) : null}
            {row.status === 'OPEN' && canClose ? (
              <DropdownMenuItem onClick={() => setClosing(row)}>
                <Lock className="h-4 w-4" />
                Close poll
              </DropdownMenuItem>
            ) : null}
            {row.status === 'DRAFT' && canUpdate ? (
              <DropdownMenuItem onClick={() => setEditing(row)}>Edit</DropdownMenuItem>
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
        title="Polls"
        description="Gather resident opinions and make decisions together."
      >
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            New poll
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search polls…"
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
        emptyMessage="No polls found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <PollFormDialog open={formOpen} onOpenChange={setFormOpen} poll={editing} />
      <PollDetailDialog
        pollId={detailId}
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
        title="Delete poll?"
        description={`"${deleting?.title}" and its results will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deletePoll.isPending}
        onConfirm={() => {
          if (deleting) deletePoll.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
      <ConfirmDialog
        open={Boolean(closing)}
        onOpenChange={(open) => {
          if (!open) setClosing(null)
        }}
        title="Close this poll?"
        description={`"${closing?.title}" will stop accepting new votes.`}
        confirmLabel="Close poll"
        loading={closePoll.isPending}
        onConfirm={() => {
          if (closing) closePoll.mutate(closing.id, { onSuccess: () => setClosing(null) })
        }}
      />
    </div>
  )
}

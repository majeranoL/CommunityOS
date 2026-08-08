import { useState } from 'react'
import { MoreHorizontal, Plus, Search, Send } from 'lucide-react'
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
  useAnnouncements,
  useDeleteAnnouncement,
  usePublishAnnouncement,
} from '@/features/announcements/hooks/use-announcements'
import { AnnouncementFormDialog } from '@/features/announcements/components/announcement-form-dialog'
import { AnnouncementDetailDialog } from '@/features/announcements/components/announcement-detail-dialog'
import type { Announcement, AnnouncementListItem } from '@/features/announcements/types/announcement'
import { formatDate } from '@/lib/format'
import { useViewParam } from '@/lib/use-view-param'

const STATUS_FILTERS = ['ALL', 'PUBLISHED', 'REVIEW', 'DRAFT', 'ARCHIVED'] as const

export default function AnnouncementsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<AnnouncementListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.announcementCreate)
  const canUpdate = useHasPermission(PERMISSIONS.announcementUpdate)
  const canDelete = useHasPermission(PERMISSIONS.announcementDelete)
  const canPublish = useHasPermission(PERMISSIONS.announcementUpdate) || useHasPermission(PERMISSIONS.announcementCreate)

  const { data, isLoading, isFetching } = useAnnouncements({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const publishAnnouncement = usePublishAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()

  useViewParam((id) => setDetailId(id))

  const columns: Column<AnnouncementListItem>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (row) => (
        <button
          type="button"
          className="text-left font-medium hover:underline"
          onClick={() => setDetailId(row.id)}
        >
          {row.title}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'publishedAt',
      header: 'Published',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.publishedAt ? formatDate(row.publishedAt) : '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
      hideBelow: 'lg',
    },
    ...(canUpdate || canDelete || canPublish
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">Actions</span>,
            cell: (row: AnnouncementListItem) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDetailId(row.id)}>View</DropdownMenuItem>
                  {(row.status === 'DRAFT' || row.status === 'REVIEW') && canPublish ? (
                    <DropdownMenuItem
                      onClick={() => publishAnnouncement.mutate(row.id)}
                      disabled={publishAnnouncement.isPending}
                    >
                      <Send className="h-4 w-4" />
                      Publish
                    </DropdownMenuItem>
                  ) : null}
                  {row.status !== 'ARCHIVED' && canUpdate ? (
                    <DropdownMenuItem onClick={() => setEditing(row as unknown as Announcement)}>
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleting(row)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } as Column<AnnouncementListItem>,
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Keep residents informed with community announcements."
      >
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            New announcement
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search announcements…"
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
        emptyMessage="No announcements found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        announcement={editing}
      />
      <AnnouncementDetailDialog
        announcementId={detailId}
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
        title="Delete announcement?"
        description={`"${deleting?.title}" will be archived and hidden from residents. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleteAnnouncement.isPending}
        onConfirm={() => {
          if (deleting) deleteAnnouncement.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

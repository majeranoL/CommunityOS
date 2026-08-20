import { useState } from 'react'
import { Archive, Download, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
import { toast } from '@/components/ui/sonner'
import { useArchiveDocument, useDeleteDocument, useDocuments, usePublishDocument } from '@/features/documents/hooks/use-documents'
import { documentsService } from '@/features/documents/services/documents'
import { DocumentFormDialog } from '@/features/documents/components/document-form-dialog'
import type { DocumentListItem } from '@/features/documents/types/document'
import { formatDate, formatFileSize, getFileExtension, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
const CATEGORY_FILTERS = ['ALL', 'POLICY', 'MINUTES', 'FINANCIAL', 'NOTICE', 'FORM', 'OTHER'] as const

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [category, setCategory] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editDocument, setEditDocument] = useState<DocumentListItem | null>(null)
  const [deleting, setDeleting] = useState<DocumentListItem | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.documentCreate)
  const canPublish = useHasPermission(PERMISSIONS.documentPublish)
  const canArchive = useHasPermission(PERMISSIONS.documentArchive)
  const canDelete = useHasPermission(PERMISSIONS.documentDelete)

  const { data, isLoading, isFetching } = useDocuments({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    category: category === 'ALL' ? undefined : category,
  })

  const publishDocument = usePublishDocument()
  const archiveDocument = useArchiveDocument()
  const deleteDocument = useDeleteDocument()

  const openFile = (row: DocumentListItem) => {
    documentsService.openFile(row).catch(() => {
      toast.error('Unable to open this file.')
    })
  }

  const columns: Column<DocumentListItem>[] = [
    {
      key: 'title',
      header: 'Document',
      cell: (row) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => openFile(row)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {getFileExtension(row.fileName)} · {formatFileSize(row.fileSize)}
            </p>
          </div>
        </button>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        <span className="text-muted-foreground">{toTitleCase(row.category)}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'uploadedBy',
      header: 'Uploaded by',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.uploadedBy ? `${row.uploadedBy.firstName} ${row.uploadedBy.lastName}` : '—'}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'createdAt',
      header: 'Added',
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
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => openFile(row)}>
            <Download className="h-4 w-4" />
            Open
          </Button>
          {canPublish ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditDocument(row)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {row.status === 'DRAFT' && canPublish ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => publishDocument.mutate(row.id)}>
              Publish
            </Button>
          ) : null}
          {row.status !== 'ARCHIVED' && canArchive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => archiveDocument.mutate(row.id)}
            >
              <Archive className="h-4 w-4" />
              Archive
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleting(row)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Community files — policies, minutes, notices, and forms."
      >
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add document
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
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
                {option === 'ALL' ? 'All statuses' : toTitleCase(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={category}
          onValueChange={(value) => {
            setCategory(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All categories' : toTitleCase(option)}
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
        emptyMessage="No documents found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <DocumentFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <DocumentFormDialog
        open={Boolean(editDocument)}
        onOpenChange={(open) => !open && setEditDocument(null)}
        document={editDocument}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete document?"
        description={`"${deleting?.title}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleteDocument.isPending}
        onConfirm={() => {
          if (deleting) deleteDocument.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

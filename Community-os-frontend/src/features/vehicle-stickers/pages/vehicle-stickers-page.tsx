import { useState } from 'react'
import { StickyNote, Plus, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
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
import { useVehicleStickers, useDeleteSticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { StickerFormDialog } from '@/features/vehicle-stickers/components/sticker-form-dialog'
import { StickerVerifyDialog } from '@/features/vehicle-stickers/components/sticker-verify-dialog'
import { StickerRenewDialog } from '@/features/vehicle-stickers/components/sticker-renew-dialog'
import { StickerDetailDialog } from '@/features/vehicle-stickers/components/sticker-detail-dialog'
import { useViewParam } from '@/lib/use-view-param'
import type { VehicleStickerListItem } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { formatDate, formatCurrency } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const

export default function VehicleStickersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatus = searchParams.get('status') ?? 'ALL'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(
    (STATUS_FILTERS as readonly string[]).includes(requestedStatus) ? requestedStatus : 'ALL',
  )
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editSticker, setEditSticker] = useState<VehicleStickerListItem | null>(null)
  const [verifySticker, setVerifySticker] = useState<VehicleStickerListItem | null>(null)
  const [renewSticker, setRenewSticker] = useState<VehicleStickerListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  useViewParam((id) => setDetailId(id))

  const canCreate = useHasPermission(PERMISSIONS.stickerCreate)
  const canUpdate = useHasPermission(PERMISSIONS.stickerUpdate)
  const canVerify = useHasPermission(PERMISSIONS.stickerVerify)
  const canDelete = useHasPermission(PERMISSIONS.stickerDelete)

  const deleteSticker = useDeleteSticker()

  const { data, isLoading, isFetching } = useVehicleStickers({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const isExpired = (sticker: VehicleStickerListItem) => {
    return sticker.expirationDate ? new Date(sticker.expirationDate) < new Date() : false
  }

  const columns: Column<VehicleStickerListItem>[] = [
    {
      key: 'sticker',
      header: 'Sticker',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-mono font-medium">
              {row.stickerNumber ?? 'PENDING'}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.vehicle?.plateNumber ?? '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      cell: (row) => (
        <span className="text-muted-foreground">
          {[row.vehicle?.make, row.vehicle?.model].filter(Boolean).join(' ') || '—'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const displayStatus = row.status === 'ACTIVE' && isExpired(row) ? 'EXPIRED' : row.status
        return <StatusBadge status={displayStatus} />
      },
    },
    {
      key: 'fee',
      header: 'Fee',
      cell: (row) => {
        if (!row.assessment) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-muted-foreground">
            {formatCurrency(row.assessment.amount)}
          </span>
        )
      },
      hideBelow: 'md',
    },
    {
      key: 'issueDate',
      header: 'Issue Date',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.issueDate)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'expirationDate',
      header: 'Expires',
      cell: (row) => {
        const expired = isExpired(row)
        return (
          <span className={expired ? 'font-medium text-destructive' : 'text-muted-foreground'}>
            {formatDate(row.expirationDate)}
          </span>
        )
      },
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {canVerify && row.status === 'PENDING' ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setVerifySticker(row)}
            >
              Verify
            </Button>
          ) : null}
          {canUpdate && row.status === 'ACTIVE' && !isExpired(row) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditSticker(row)}
            >
              Edit
            </Button>
          ) : null}
          {canCreate && (row.status === 'ACTIVE' || row.status === 'EXPIRED') ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRenewSticker(row)}
            >
              Renew
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => deleteSticker.mutate(row.id)}
            >
              Delete
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Stickers"
        description="Manage vehicle sticker applications and renewals."
      >
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Issue sticker
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sticker number or plate…"
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
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              if (value === 'ALL') next.delete('status')
              else next.set('status', value)
              return next
            }, { replace: true })
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
                  : option.charAt(0) + option.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">Updating…</span>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No stickers found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <StickerFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <StickerFormDialog
        open={Boolean(editSticker)}
        onOpenChange={(open) => !open && setEditSticker(null)}
        sticker={editSticker}
      />
      <StickerVerifyDialog
        open={Boolean(verifySticker)}
        onOpenChange={(open) => !open && setVerifySticker(null)}
        sticker={verifySticker}
      />
      <StickerRenewDialog
        open={Boolean(renewSticker)}
        onOpenChange={(open) => !open && setRenewSticker(null)}
        sticker={renewSticker}
      />
      <StickerDetailDialog
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        stickerId={detailId}
      />
    </div>
  )
}
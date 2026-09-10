import { useState } from 'react'
import { Settings2, Plus, Search, StickyNote } from 'lucide-react'
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
import {
  useCancelRequest,
  useVehicleStickers,
} from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { StickerFormDialog } from '@/features/vehicle-stickers/components/sticker-form-dialog'
import { StickerVerifyDialog } from '@/features/vehicle-stickers/components/sticker-verify-dialog'
import { StickerDetailDialog } from '@/features/vehicle-stickers/components/sticker-detail-dialog'
import { StickerSettingsDialog } from '@/features/vehicle-stickers/components/sticker-settings-dialog'
import { useViewParam } from '@/lib/use-view-param'
import type { StickerRequestListItem } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { formatDate, formatCurrency } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const

export default function VehicleStickersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedStatus = searchParams.get('status') ?? 'ALL'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>(
    (STATUS_FILTERS as readonly string[]).includes(requestedStatus) ? requestedStatus : 'ALL',
  )
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [verifyRequest, setVerifyRequest] = useState<StickerRequestListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  useViewParam((id) => setDetailId(id))

  const canCreate = useHasPermission(PERMISSIONS.stickerCreate)
  const canVerify = useHasPermission(PERMISSIONS.stickerVerify)

  const cancelRequest = useCancelRequest()

  const { data, isLoading, isFetching } = useVehicleStickers({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const columns: Column<StickerRequestListItem>[] = [
    {
      key: 'request',
      header: 'Request',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <StickyNote className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-mono font-medium">{row.requestNumber}</p>
            <p className="text-xs text-muted-foreground uppercase">{row.vehicle?.plateNumber}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stickers',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.status === 'APPROVED' && row.stickers.length > 0
            ? `${row.stickers.length}x issued`
            : `${row.quantity} requested`}
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
      key: 'fee',
      header: 'Fee',
      cell: (row) => {
        const fee = Number(row.feeTotal ?? 0)
        return <span className="text-muted-foreground">{fee > 0 ? formatCurrency(fee) : 'Free'}</span>
      },
      hideBelow: 'md',
    },
    {
      key: 'requestedBy',
      header: 'Requested by',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.requestedBy.firstName} {row.requestedBy.lastName}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'createdAt',
      header: 'Requested at',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
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
              onClick={() => setVerifyRequest(row)}
            >
              Verify
            </Button>
          ) : null}
          {canCreate && row.status === 'PENDING' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => cancelRequest.mutate(row.id)}
            >
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDetailId(row.id)}
          >
            View
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Stickers"
        description="Manage vehicle sticker requests, issuance, and renewals."
      >
        {canVerify ? (
          <Button variant="outline" onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Settings
          </Button>
        ) : null}
        {canVerify ? (
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
            placeholder="Search request number or plate…"
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
        onRowClick={(row) => setDetailId(row.id)}
        isLoading={isLoading}
        emptyMessage="No sticker requests found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <StickerFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <StickerSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <StickerVerifyDialog
        open={Boolean(verifyRequest)}
        onOpenChange={(open) => !open && setVerifyRequest(null)}
        request={verifyRequest}
      />
      <StickerDetailDialog
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
        stickerId={detailId}
      />
    </div>
  )
}
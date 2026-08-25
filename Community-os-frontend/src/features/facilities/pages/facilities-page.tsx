import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2,
  Check,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Undo2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission, useAuthStore } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useFacilities, useDeleteFacility } from '@/features/facilities/hooks/use-facilities'
import { useReservations, useDeleteReservation } from '@/features/facilities/hooks/use-reservations'
import {
  useFacilityItems,
  useDeleteFacilityItem,
  useFacilityItemLoans,
  useApproveLoan,
  useRejectLoan,
  useReturnLoan,
  useCancelLoan,
} from '@/features/facilities/hooks/use-facility-items'
import { FacilityFormDialog } from '@/features/facilities/components/facility-form-dialog'
import { FacilityDetailDialog } from '@/features/facilities/components/facility-detail-dialog'
import { ReservationFormDialog } from '@/features/facilities/components/reservation-form-dialog'
import { ReservationDetailDialog } from '@/features/facilities/components/reservation-detail-dialog'
import { ItemFormDialog } from '@/features/facilities/components/item-form-dialog'
import { BorrowItemDialog } from '@/features/facilities/components/borrow-item-dialog'
import { facilityStatuses, facilityTypes } from '@/features/facilities/validation/facility'
import { facilityItemCategories } from '@/features/facilities/types/facility-item'
import type { FacilityListItem } from '@/features/facilities/types/facility'
import type { FacilityItem, FacilityItemLoan } from '@/features/facilities/types/facility-item'
import type { ReservationListItem } from '@/features/facilities/types/reservation'
import { formatDate, formatCurrency, formatDateTime } from '@/lib/format'
import { useViewParam } from '@/lib/use-view-param'

const RESERVATION_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const
const LOAN_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'RETURNED', 'REJECTED', 'CANCELLED'] as const

function itemFeeLabel(item: FacilityItem) {
  const fee = item.borrowFee != null ? Number(item.borrowFee) : null
  if (fee == null || fee === 0) return 'Free'
  return `${formatCurrency(fee)} / unit`
}

function loanFeeLabel(loan: FacilityItemLoan) {
  const fee = loan.totalFee != null ? Number(loan.totalFee) : 0
  return fee > 0 ? formatCurrency(fee) : 'Free'
}

function FacilitiesTab() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FacilityListItem | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<FacilityListItem | null>(null)

  const canUpdate = useHasPermission(PERMISSIONS.facilityUpdate)
  const canDelete = useHasPermission(PERMISSIONS.facilityDelete)

  const { data, isLoading, isFetching } = useFacilities({
    page,
    limit: 10,
    search: search || undefined,
    type: type === 'ALL' ? undefined : type,
    status: status === 'ALL' ? undefined : status,
  })

  const deleteFacility = useDeleteFacility()

  const columns: Column<FacilityListItem>[] = [
    {
      key: 'name',
      header: 'Facility',
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setDetailId(row.id)}>
          <p className="font-medium hover:underline">{row.name}</p>
          <p className="text-xs text-muted-foreground">
            {facilityTypes.find((option) => option.value === row.type)?.label ?? row.type}
          </p>
        </button>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (row) => <span className="text-muted-foreground">{row.location ?? '—'}</span>,
      hideBelow: 'md',
    },
    {
      key: 'capacity',
      header: 'Capacity',
      cell: (row) => <span className="text-muted-foreground">{row.capacity ?? '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Added',
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
            {canUpdate ? (
              <DropdownMenuItem onClick={() => setEditing(row)}>
                <Pencil className="h-4 w-4" />
                Edit
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {facilityTypes.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <SelectItem value="ALL">All statuses</SelectItem>
            {facilityStatuses.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No facilities found."
      />

      {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <FacilityFormDialog
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        facility={editing}
      />
      <FacilityDetailDialog
        facilityId={detailId}
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
        title="Delete facility?"
        description={`"${deleting?.name}" will be closed and hidden from residents.`}
        confirmLabel="Delete"
        destructive
        loading={deleteFacility.isPending}
        onConfirm={() => {
          if (deleting) deleteFacility.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function ReservationsTab({
  detailId,
  onDetailIdChange,
}: {
  detailId: string | null
  onDetailIdChange: (id: string | null) => void
}) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [myOnly, setMyOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<ReservationListItem | null>(null)

  const user = useAuthStore((state) => state.user)
  const myResidentId = user?.resident?.id

  const canCreate = useHasPermission(PERMISSIONS.reservationCreate)
  const canDelete = useHasPermission(PERMISSIONS.reservationDelete)

  const { data, isLoading, isFetching } = useReservations({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    residentId: myOnly ? myResidentId : undefined,
  })

  const deleteReservation = useDeleteReservation()

  const columns: Column<ReservationListItem>[] = [
    {
      key: 'facility',
      header: 'Facility',
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => onDetailIdChange(row.id)}>
          <p className="font-medium hover:underline">{row.facility.name}</p>
          <p className="text-xs text-muted-foreground">{row.purpose ?? '—'}</p>
        </button>
      ),
    },
    {
      key: 'resident',
      header: 'Resident',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.resident.firstName} {row.resident.lastName}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'startAt',
      header: 'Start',
      cell: (row) => <span className="text-muted-foreground">{formatDateTime(row.startAt)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Requested',
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
            <DropdownMenuItem onClick={() => onDetailIdChange(row.id)}>View</DropdownMenuItem>
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reservations…"
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
              {RESERVATION_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'ALL'
                    ? 'All statuses'
                    : option.charAt(0) + option.slice(1).toLowerCase()}
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
              My reservations
            </label>
          ) : null}
        </div>
        {canCreate ? (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New reservation
          </Button>
        ) : null}
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No reservations found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ReservationFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ReservationDetailDialog
        reservationId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) onDetailIdChange(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete reservation?"
        description="This reservation will be removed from the record."
        confirmLabel="Delete"
        destructive
        loading={deleteReservation.isPending}
        onConfirm={() => {
          if (deleting) deleteReservation.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function ItemsTab() {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FacilityItem | null>(null)
  const [borrowing, setBorrowing] = useState<FacilityItem | null>(null)
  const [deleting, setDeleting] = useState<FacilityItem | null>(null)

  const canManage = useHasPermission(PERMISSIONS.facilityItemManage)
  const canBorrow = useHasPermission(PERMISSIONS.facilityItemBorrow)

  const { data: items, isLoading } = useFacilityItems()
  const deleteItem = useDeleteFacilityItem()

  const columns: Column<FacilityItem>[] = [
    {
      key: 'name',
      header: 'Item',
      cell: (row) => (
        <div className="text-left">
          <p className="font-medium">{row.name}</p>
          {row.description ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      cell: (row) => (
        <span className="text-muted-foreground">
          {facilityItemCategories.find((option) => option.value === row.category)?.label ??
            'Other'}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'availability',
      header: 'Available',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.quantityAvailable} / {row.quantityTotal}
        </span>
      ),
    },
    {
      key: 'fee',
      header: 'Fee',
      cell: (row) => itemFeeLabel(row),
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
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
            {canBorrow && row.isActive && row.quantityAvailable > 0 ? (
              <DropdownMenuItem onClick={() => setBorrowing(row)}>Borrow</DropdownMenuItem>
            ) : null}
            {canManage ? (
              <>
                {canBorrow ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem onClick={() => setEditing(row)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleting(row)}
                >
                  Remove
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Items residents can request to borrow.
        </p>
        {canManage ? (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New item
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No borrowable items yet."
      />

      <ItemFormDialog
        open={formOpen || Boolean(editing)}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        item={editing}
      />
      <BorrowItemDialog
        item={borrowing}
        open={Boolean(borrowing)}
        onOpenChange={(open) => {
          if (!open) setBorrowing(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Remove item?"
        description={`"${deleting?.name}" will be hidden from residents. Past borrow records are kept.`}
        confirmLabel="Remove"
        destructive
        loading={deleteItem.isPending}
        onConfirm={() => {
          if (deleting) deleteItem.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

function BorrowRequestsTab() {
  const user = useAuthStore((state) => state.user)
  const myResidentId = user?.resident?.id

  const canManage = useHasPermission(PERMISSIONS.facilityItemManage)

  const [status, setStatus] = useState('ALL')
  const [myOnly, setMyOnly] = useState(false)
  const [rejecting, setRejecting] = useState<FacilityItemLoan | null>(null)
  const [cancelling, setCancelling] = useState<FacilityItemLoan | null>(null)

  const { data: loans, isLoading, isFetching } = useFacilityItemLoans({
    status,
    mine: myOnly,
  })

  const approveLoan = useApproveLoan()
  const rejectLoan = useRejectLoan()
  const returnLoan = useReturnLoan()
  const cancelLoan = useCancelLoan()

  const columns: Column<FacilityItemLoan>[] = [
    {
      key: 'item',
      header: 'Item',
      cell: (row) => (
        <div className="text-left">
          <p className="font-medium">{row.item?.name ?? 'Removed item'}</p>
          <p className="text-xs text-muted-foreground">{row.loanNumber}</p>
        </div>
      ),
    },
    {
      key: 'resident',
      header: 'Resident',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.resident.firstName} {row.resident.lastName}
        </span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'period',
      header: 'Period',
      cell: (row) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {formatDate(row.neededFrom)} → {formatDate(row.neededUntil)}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'quantity',
      header: 'Qty',
      cell: (row) => <span className="text-muted-foreground">×{row.quantity}</span>,
    },
    {
      key: 'fee',
      header: 'Fee',
      cell: (row) => loanFeeLabel(row),
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
      cell: (row) => {
        const isOwn = myResidentId != null && row.residentId === myResidentId
        return (
          <div className="flex justify-end gap-1">
            {canManage && row.status === 'PENDING' ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Approve"
                  disabled={approveLoan.isPending}
                  onClick={() => approveLoan.mutate(row.id)}
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="sr-only">Approve</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Reject"
                  onClick={() => setRejecting(row)}
                >
                  <X className="h-4 w-4 text-destructive" />
                  <span className="sr-only">Reject</span>
                </Button>
              </>
            ) : null}
            {canManage && row.status === 'APPROVED' ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={returnLoan.isPending}
                onClick={() => returnLoan.mutate({ loanId: row.id })}
              >
                <Undo2 className="h-4 w-4" />
                Returned
              </Button>
            ) : null}
            {isOwn && row.status === 'PENDING' ? (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Cancel request"
                onClick={() => setCancelling(row)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel request</span>
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {LOAN_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'ALL'
                    ? 'All statuses'
                    : option.charAt(0) + option.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {myResidentId ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={myOnly} onCheckedChange={setMyOnly} />
              My requests
            </label>
          ) : null}
        </div>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">Updating…</span>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={loans ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No borrow requests yet."
      />

      <ConfirmDialog
        open={Boolean(rejecting)}
        onOpenChange={(open) => {
          if (!open) setRejecting(null)
        }}
        title="Reject borrow request?"
        description={`Request ${rejecting?.loanNumber} for "${rejecting?.item?.name}" will be rejected.`}
        confirmLabel="Reject"
        destructive
        loading={rejectLoan.isPending}
        onConfirm={() => {
          if (rejecting) {
            rejectLoan.mutate(
              { loanId: rejecting.id },
              { onSuccess: () => setRejecting(null) },
            )
          }
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => {
          if (!open) setCancelling(null)
        }}
        title="Cancel this request?"
        description={`Your pending request for "${cancelling?.item?.name}" will be cancelled.`}
        confirmLabel="Cancel request"
        destructive
        loading={cancelLoan.isPending}
        onConfirm={() => {
          if (cancelling) {
            cancelLoan.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })
          }
        }}
      />
    </div>
  )
}

export default function FacilitiesPage() {
  const canCreate = useHasPermission(PERMISSIONS.facilityCreate)
  const canSeeItems = useHasPermission(PERMISSIONS.facilityView)
  const canSeeLoans = useHasPermission(PERMISSIONS.facilityItemBorrow)
  const [facilityFormOpen, setFacilityFormOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState(
    requestedTab === 'reservations' ||
      (requestedTab === 'items' && canSeeItems) ||
      (requestedTab === 'requests' && canSeeLoans)
      ? requestedTab
      : 'facilities',
  )
  const [reservationDetailId, setReservationDetailId] = useState<string | null>(null)

  useViewParam((id) => setReservationDetailId(id))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities"
        description="Manage amenities, reservations, and borrowable items."
      >
        {canCreate ? (
          <Button onClick={() => setFacilityFormOpen(true)}>
            <Plus className="h-4 w-4" />
            New facility
          </Button>
        ) : null}
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="facilities">
            <Building2 className="mr-2 h-4 w-4" />
            Facilities
          </TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          {canSeeItems ? (
            <TabsTrigger value="items">
              <Package className="mr-2 h-4 w-4" />
              Items
            </TabsTrigger>
          ) : null}
          {canSeeLoans ? <TabsTrigger value="requests">Borrow requests</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="facilities">
          <FacilitiesTab />
        </TabsContent>
        <TabsContent value="reservations">
          <ReservationsTab
            detailId={reservationDetailId}
            onDetailIdChange={setReservationDetailId}
          />
        </TabsContent>
        {canSeeItems ? (
          <TabsContent value="items">
            <ItemsTab />
          </TabsContent>
        ) : null}
        {canSeeLoans ? (
          <TabsContent value="requests">
            <BorrowRequestsTab />
          </TabsContent>
        ) : null}
      </Tabs>

      <FacilityFormDialog open={facilityFormOpen} onOpenChange={setFacilityFormOpen} />
    </div>
  )
}

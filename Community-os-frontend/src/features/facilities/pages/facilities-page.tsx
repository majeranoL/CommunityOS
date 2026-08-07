import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, MoreHorizontal, Pencil, Plus, Search } from 'lucide-react'
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
import { FacilityFormDialog } from '@/features/facilities/components/facility-form-dialog'
import { FacilityDetailDialog } from '@/features/facilities/components/facility-detail-dialog'
import { ReservationFormDialog } from '@/features/facilities/components/reservation-form-dialog'
import { ReservationDetailDialog } from '@/features/facilities/components/reservation-detail-dialog'
import { facilityStatuses, facilityTypes } from '@/features/facilities/validation/facility'
import type { FacilityListItem } from '@/features/facilities/types/facility'
import type { ReservationListItem } from '@/features/facilities/types/reservation'
import { formatDate, formatDateTime } from '@/lib/format'
import { useViewParam } from '@/lib/use-view-param'

const RESERVATION_STATUSES = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const

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

export default function FacilitiesPage() {
  const canCreate = useHasPermission(PERMISSIONS.facilityCreate)
  const [facilityFormOpen, setFacilityFormOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(
    searchParams.get('tab') === 'reservations' ? 'reservations' : 'facilities',
  )
  const [reservationDetailId, setReservationDetailId] = useState<string | null>(null)

  useViewParam((id) => setReservationDetailId(id))

  return (
    <div className="space-y-6">
      <PageHeader title="Facilities" description="Manage amenities and their reservations.">
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
      </Tabs>

      <FacilityFormDialog open={facilityFormOpen} onOpenChange={setFacilityFormOpen} />
    </div>
  )
}

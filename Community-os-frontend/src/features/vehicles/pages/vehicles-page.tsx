import { useState } from 'react'
import { Car, Download, Plus, Search, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { DataTable, type Column } from '@/components/shared/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission, useAuthStore } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { documentsService } from '@/features/documents/services/documents'
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles'
import { useDeleteVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { useDeactivateVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { useRevalidateVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { VehicleFormDialog } from '@/features/vehicles/components/vehicle-form-dialog'
import { ModuleImportDialog } from '@/features/shared/import-export/module-import-dialog'
import { ModuleExportDialog } from '@/features/shared/import-export/module-export-dialog'
import type { VehicleListItem } from '@/features/vehicles/types/vehicle'
import { formatDate, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = [
  'ALL',
  'ACTIVE',
  'DEACTIVATED',
  'TRANSFERRED',
  'INACTIVE',
] as const
const TYPE_FILTERS = ['ALL', 'CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'BICYCLE', 'OTHER'] as const

export default function VehiclesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [type, setType] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<VehicleListItem | null>(null)
  const [deleteVehicle, setDeleteVehicle] = useState<VehicleListItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const user = useAuthStore((state) => state.user)
  const myResidentId = user?.resident?.id

  const canCreate = useHasPermission(PERMISSIONS.vehicleCreate)
  const canImport = useHasPermission(PERMISSIONS.vehicleImport)
  const canExport = useHasPermission(PERMISSIONS.vehicleExport)

  const deleteVehicleMutation = useDeleteVehicle()
  const deactivateVehicle = useDeactivateVehicle()
  const revalidateVehicle = useRevalidateVehicle()

  const isOwnRow = (row: VehicleListItem) =>
    Boolean(myResidentId) && row.residentId === myResidentId

  const { data, isLoading, isFetching } = useVehicles({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    type: type === 'ALL' ? undefined : type,
  })

  const ownerName = (row: VehicleListItem) =>
    row.resident ? `${row.resident.firstName} ${row.resident.lastName}` : null

  const columns: Column<VehicleListItem>[] = [
    {
      key: 'plate',
      header: 'Vehicle',
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.photoUrl ? (
            <button
              type="button"
              className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md border bg-muted hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => documentsService.openFile({ fileUrl: row.photoUrl })}
              title="View vehicle photo"
            >
              <img
                src={row.photoUrl}
                alt={row.plateNumber}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </button>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Car className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="leading-tight">
            <p className="font-mono font-medium uppercase">{row.plateNumber}</p>
            <p className="text-xs text-muted-foreground">
              {[row.make, row.model, row.color].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Owner',
      cell: (row) => <span className="text-muted-foreground">{ownerName(row) || '—'}</span>,
      hideBelow: 'md',
    },
    {
      key: 'type',
      header: 'Type',
      cell: (row) => (
        <span className="text-muted-foreground">{row.type ? toTitleCase(row.type) : '—'}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'sticker',
      header: 'Sticker',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.parkingStickerNumber || (row.hasSticker ? 'Yes' : '—')}
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
      key: 'createdAt',
      header: 'Added',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        isOwnRow(row) ? (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditVehicle(row)}
            >
              Edit
            </Button>
            {['ACTIVE'].includes(row.status) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => deactivateVehicle.mutate(row.id)}
              >
                Unregister
              </Button>
            ) : null}
            {['DEACTIVATED', 'TRANSFERRED'].includes(row.status) ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => revalidateVehicle.mutate(row.id)}
              >
                Reactivate
              </Button>
            ) : null}
            {row.status !== 'INACTIVE' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteVehicle(row)}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        description="Registered vehicles and their residents."
      >
        <div className="flex items-center gap-2">
          {(canImport || canExport) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Import / Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canImport ? (
                  <DropdownMenuItem onClick={() => setImportOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Import from file
                  </DropdownMenuItem>
                ) : null}
                {canExport ? (
                  <DropdownMenuItem onClick={() => setExportOpen(true)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export data
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {canCreate ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Add vehicle
            </Button>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search plate, owner, or make…"
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
                {option === 'ALL' ? 'All statuses' : option.charAt(0) + option.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All types' : toTitleCase(option)}
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
        emptyMessage="No vehicles found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <VehicleFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <VehicleFormDialog
        open={Boolean(editVehicle)}
        onOpenChange={(open) => !open && setEditVehicle(null)}
        vehicle={editVehicle}
      />
      <AlertDialog open={Boolean(deleteVehicle)} onOpenChange={(open) => !open && setDeleteVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently unregister the vehicle with plate{' '}
              <span className="font-mono uppercase">{deleteVehicle?.plateNumber}</span> from
              your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteVehicleMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                if (deleteVehicle) {
                  deleteVehicleMutation.mutate(deleteVehicle.id, {
                    onSuccess: () => setDeleteVehicle(null),
                  })
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ModuleImportDialog open={importOpen} onOpenChange={setImportOpen} module="vehicles" entityLabel="Vehicle" />
      <ModuleExportDialog open={exportOpen} onOpenChange={setExportOpen} module="vehicles" entityLabel="Vehicle" />
    </div>
  )
}

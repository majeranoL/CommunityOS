import { useState } from 'react'
import { Car, Download, Plus, Search, Upload } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles'
import { useVerifyVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { useDeactivateVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { useRevalidateVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { VehicleFormDialog } from '@/features/vehicles/components/vehicle-form-dialog'
import { VehicleTransferDialog } from '@/features/vehicles/components/vehicle-transfer-dialog'
import { ModuleImportDialog } from '@/features/shared/import-export/module-import-dialog'
import { ModuleExportDialog } from '@/features/shared/import-export/module-export-dialog'
import type { VehicleListItem } from '@/features/vehicles/types/vehicle'
import { formatDate, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = [
  'ALL',
  'PENDING',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
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
  const [transferVehicle, setTransferVehicle] = useState<VehicleListItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const canCreate = useHasPermission(PERMISSIONS.vehicleCreate)
  const canUpdate = useHasPermission(PERMISSIONS.vehicleUpdate)
  const canVerify = useHasPermission(PERMISSIONS.vehicleVerify)
  const canImport = useHasPermission(PERMISSIONS.vehicleImport)
  const canExport = useHasPermission(PERMISSIONS.vehicleExport)

  const verifyVehicle = useVerifyVehicle()
  const deactivateVehicle = useDeactivateVehicle()
  const revalidateVehicle = useRevalidateVehicle()

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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Car className="h-4 w-4 text-muted-foreground" />
          </div>
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
        <span className="text-muted-foreground">{row.parkingStickerNumber || '—'}</span>
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
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditVehicle(row)}
            >
              Edit
            </Button>
          ) : null}
          {canVerify && row.status === 'PENDING' ? (
            <>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() =>
                  verifyVehicle.mutate({
                    id: row.id,
                    input: { approved: true },
                  })
                }
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  verifyVehicle.mutate({
                    id: row.id,
                    input: { approved: false },
                  })
                }
              >
                Reject
              </Button>
            </>
          ) : null}
          {canUpdate && ['ACTIVE', 'APPROVED'].includes(row.status) ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferVehicle(row)}
              >
                Transfer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => deactivateVehicle.mutate(row.id)}
              >
                Deactivate
              </Button>
            </>
          ) : null}
          {canUpdate && ['DEACTIVATED', 'TRANSFERRED'].includes(row.status) ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => revalidateVehicle.mutate(row.id)}
            >
              Revalidate
            </Button>
          ) : null}
        </div>
      ),
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
      <VehicleTransferDialog
        open={Boolean(transferVehicle)}
        onOpenChange={(open) => !open && setTransferVehicle(null)}
        vehicle={transferVehicle}
      />
      <ModuleImportDialog open={importOpen} onOpenChange={setImportOpen} module="vehicles" entityLabel="Vehicle" />
      <ModuleExportDialog open={exportOpen} onOpenChange={setExportOpen} module="vehicles" entityLabel="Vehicle" />
    </div>
  )
}

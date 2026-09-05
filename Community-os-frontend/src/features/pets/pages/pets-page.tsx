import { useState } from 'react'
import { Download, PawPrint, Plus, Search, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
import { usePets } from '@/features/pets/hooks/use-pets'
import { useVerifyPet } from '@/features/pets/hooks/use-pets'
import { useDeactivatePet } from '@/features/pets/hooks/use-pets'
import { useRevalidatePet } from '@/features/pets/hooks/use-pets'
import { useDeletePet } from '@/features/pets/hooks/use-pets'
import { PetFormDialog } from '@/features/pets/components/pet-form-dialog'
import { PetDetailDialog } from '@/features/pets/components/pet-detail-dialog'
import { ModuleImportDialog } from '@/features/shared/import-export/module-import-dialog'
import { ModuleExportDialog } from '@/features/shared/import-export/module-export-dialog'
import type { PetListItem } from '@/features/pets/types/pet'
import { formatDate, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = [
  'ALL',
  'PENDING',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'DEACTIVATED',
  'INACTIVE',
] as const
const SPECIES_FILTERS = [
  'ALL',
  'DOG',
  'CAT',
  'BIRD',
  'FISH',
  'REPTILE',
  'SMALL_ANIMAL',
  'OTHER',
] as const

export default function PetsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [species, setSpecies] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editPet, setEditPet] = useState<PetListItem | null>(null)
  const [detailPetId, setDetailPetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PetListItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const canCreate = useHasPermission(PERMISSIONS.petCreate)
  const canUpdate = useHasPermission(PERMISSIONS.petUpdate)
  const canDelete = useHasPermission(PERMISSIONS.petDelete)
  const canVerify = useHasPermission(PERMISSIONS.petVerify)
  const canImport = useHasPermission(PERMISSIONS.petImport)
  const canExport = useHasPermission(PERMISSIONS.petExport)

  const verifyPet = useVerifyPet()
  const deactivatePet = useDeactivatePet()
  const revalidatePet = useRevalidatePet()
  const deletePet = useDeletePet()

  const { data, isLoading, isFetching } = usePets({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    species: species === 'ALL' ? undefined : species,
  })

  const caretakerName = (row: PetListItem) =>
    row.resident ? `${row.resident.firstName} ${row.resident.lastName}` : null

  const columns: Column<PetListItem>[] = [
    {
      key: 'name',
      header: 'Pet',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <PawPrint className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.petNumber}
              {row.breed ? ` · ${row.breed}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'caretaker',
      header: 'Caretaker',
      cell: (row) => <span className="text-muted-foreground">{caretakerName(row) || '—'}</span>,
      hideBelow: 'md',
    },
    {
      key: 'species',
      header: 'Species',
      cell: (row) => (
        <span className="text-muted-foreground">{toTitleCase(row.species)}</span>
      ),
      hideBelow: 'md',
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
          <Button type="button" variant="ghost" size="sm" onClick={() => setDetailPetId(row.id)}>
            View
          </Button>
          {canUpdate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditPet(row)}
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
                  verifyPet.mutate({
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
                  verifyPet.mutate({
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => deactivatePet.mutate(row.id)}
            >
              Deactivate
            </Button>
          ) : null}
          {canUpdate && row.status === 'DEACTIVATED' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => revalidatePet.mutate(row.id)}
            >
              Revalidate
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => setDeleting(row)}
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
        title="Pets"
        description="Registered household pets."
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
              Register pet
            </Button>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pet, breed, or caretaker…"
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
          value={species}
          onValueChange={(value) => {
            setSpecies(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Species" />
          </SelectTrigger>
          <SelectContent>
            {SPECIES_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All species' : toTitleCase(option)}
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
        emptyMessage="No pets found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <PetFormDialog open={formOpen} onOpenChange={setFormOpen} selfService={!canVerify} />
      <PetFormDialog
        open={Boolean(editPet)}
        onOpenChange={(open) => !open && setEditPet(null)}
        pet={editPet}
      />
      <PetDetailDialog
        open={Boolean(detailPetId)}
        onOpenChange={(open) => !open && setDetailPetId(null)}
        petId={detailPetId}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete pet?"
        description={`This will permanently remove ${deleting?.name} (${deleting?.petNumber}) from the community.`}
        confirmLabel="Delete"
        destructive
        loading={deletePet.isPending}
        onConfirm={() =>
          deleting &&
          deletePet.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }
      />
      <ModuleImportDialog open={importOpen} onOpenChange={setImportOpen} module="pets" entityLabel="Pet" />
      <ModuleExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        module="pets"
        entityLabel="Pet"
        filters={{
          ...(search ? { search } : {}),
          ...(status !== 'ALL' ? { status } : {}),
          ...(species !== 'ALL' ? { species } : {}),
        }}
      />
    </div>
  )
}

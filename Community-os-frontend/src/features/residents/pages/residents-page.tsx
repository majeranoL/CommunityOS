import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
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
import { useResidents } from '@/features/residents/hooks/use-residents'
import { ResidentFormDialog } from '@/features/residents/components/resident-form-dialog'
import { ResidentDetailsDialog } from '@/features/residents/components/resident-details-dialog'
import type { ResidentListItem } from '@/features/residents/types/resident'
import { formatDate, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'MOVED_OUT'] as const
const GENDER_FILTERS = ['ALL', 'MALE', 'FEMALE', 'OTHER'] as const

function formatHousehold(household: ResidentListItem['household']) {
  if (!household) return null
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || null
  )
}

export default function ResidentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [gender, setGender] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.residentCreate)
  const canUpdate = useHasPermission(PERMISSIONS.residentUpdate)

  const { data, isLoading, isFetching } = useResidents({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    gender: gender === 'ALL' ? undefined : gender,
  })

  const columns: Column<ResidentListItem>[] = [
    {
      key: 'name',
      header: 'Resident',
      cell: (row) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left hover:underline"
          onClick={() => setSelectedId(row.id)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-medium">
              {row.firstName.charAt(0)}
              {row.lastName.charAt(0)}
            </span>
          </div>
          <div className="leading-tight">
            <p className="font-medium">
              {row.firstName} {row.lastName}
              {row.suffix ? ` ${row.suffix}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.residentNumber}
            </p>
          </div>
        </button>
      ),
    },
    {
      key: 'household',
      header: 'Household',
      cell: (row) => {
        const label = formatHousehold(row.household)
        return <span className="text-muted-foreground">{label || '—'}</span>
      },
      hideBelow: 'md',
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.phoneNumber || row.email || '—'}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'gender',
      header: 'Gender',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.gender ? toTitleCase(row.gender) : '—'}
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
      key: 'createdAt',
      header: 'Joined',
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        canUpdate ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              setEditId(row.id)
            }}
          >
            Edit
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Residents"
        description="Your community directory — residents, units, and household assignments."
      >
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add resident
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or ID…"
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
                {option === 'ALL' ? 'All statuses' : toTitleCase(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={gender}
          onValueChange={(value) => {
            setGender(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All genders' : toTitleCase(option)}
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
        emptyMessage="No residents found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <ResidentFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ResidentFormDialog
        open={Boolean(editId)}
        onOpenChange={(open) => !open && setEditId(null)}
        residentId={editId}
      />
      <ResidentDetailsDialog
        residentId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </div>
  )
}

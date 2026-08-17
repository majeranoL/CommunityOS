import { useMemo, useState } from 'react'
import { Download, Home, Plus, Search, Upload } from 'lucide-react'
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
import { useHouseholds } from '@/features/households/hooks/use-households'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
import { HouseholdFormDialog } from '@/features/households/components/household-form-dialog'
import { HouseholdDetailsDialog } from '@/features/households/components/household-details-dialog'
import { ModuleImportDialog } from '@/features/shared/import-export/module-import-dialog'
import { ModuleExportDialog } from '@/features/shared/import-export/module-export-dialog'
import type { HouseholdListItem } from '@/features/households/types/household'
import { formatCurrency, formatDate } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'] as const

const STANDING_FILTERS = ['ALL', 'GOOD', 'BAD'] as const

const GOOD_BAD_STANDING_FEATURE = 'good-bad-standing'

function unitLabel(household: HouseholdListItem) {
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || 'Unnamed unit'
  )
}

export default function HouseholdsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [standing, setStanding] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<string>('createdAt')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const canCreate = useHasPermission(PERMISSIONS.householdCreate)
  const canUpdate = useHasPermission(PERMISSIONS.householdUpdate)
  const canImport = useHasPermission(PERMISSIONS.householdImport)
  const canExport = useHasPermission(PERMISSIONS.householdExport)

  const standingEnabled = useIsFeatureEnabled(GOOD_BAD_STANDING_FEATURE)

  const { data, isLoading, isFetching } = useHouseholds({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const rows = useMemo(() => {
    const items = data?.items ?? []
    const filtered =
      standing === 'ALL'
        ? items
        : items.filter((row) => row.finance?.standing === standing)

    if (sortBy === 'outstanding') {
      return [...filtered].sort(
        (a, b) => (b.finance?.outstanding ?? 0) - (a.finance?.outstanding ?? 0),
      )
    }

    if (sortBy === 'monthsBehind') {
      return [...filtered].sort(
        (a, b) =>
          (b.finance?.monthsBehind ?? 0) - (a.finance?.monthsBehind ?? 0),
      )
    }

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [data, standing, sortBy])

  const columns: Column<HouseholdListItem>[] = [
    {
      key: 'unit',
      header: 'Unit',
      cell: (row) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left hover:underline"
          onClick={() => setSelectedId(row.id)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Home className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="font-medium">{unitLabel(row)}</span>
        </button>
      ),
    },
    {
      key: 'residents',
      header: 'Residents',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.residentCount} resident{row.residentCount === 1 ? '' : 's'}
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
      key: 'standing',
      header: standingEnabled ? 'Standing' : 'Outstanding',
      cell: (row) =>
        row.finance ? (
          <div className="space-y-0.5">
            {standingEnabled ? <StatusBadge status={row.finance.standing} /> : null}
            <p className="text-xs text-muted-foreground">
              {formatCurrency(row.finance.outstanding)} outstanding
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      hideBelow: 'md',
    },
    {
      key: 'createdAt',
      header: 'Added',
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
        title="Households"
        description="Property units and their current residents."
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
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add household
            </Button>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search block, lot, unit, or address…"
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
                {option === 'ALL'
                  ? 'All statuses'
                  : option.charAt(0) + option.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {standingEnabled ? (
          <Select
            value={standing}
            onValueChange={(value) => {
              setStanding(value)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Standing" />
            </SelectTrigger>
            <SelectContent>
              {STANDING_FILTERS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option === 'ALL'
                    ? 'All standing'
                    : option === 'GOOD'
                      ? 'Good standing'
                      : 'Bad standing'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Newest first</SelectItem>
            <SelectItem value="outstanding">Highest outstanding</SelectItem>
            <SelectItem value="monthsBehind">Most months behind</SelectItem>
          </SelectContent>
        </Select>
        {isFetching ? (
          <span className="text-xs text-muted-foreground">Updating…</span>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No households found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <HouseholdFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <HouseholdFormDialog
        open={Boolean(editId)}
        onOpenChange={(open) => !open && setEditId(null)}
        householdId={editId}
      />
      <HouseholdDetailsDialog
        householdId={selectedId}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
      <ModuleImportDialog open={importOpen} onOpenChange={setImportOpen} module="households" entityLabel="Household" />
      <ModuleExportDialog open={exportOpen} onOpenChange={setExportOpen} module="households" entityLabel="Household" />
    </div>
  )
}

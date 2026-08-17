import { useState } from 'react'
import { Briefcase, Download, Plus, Search, Upload } from 'lucide-react'
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
import { useStaffList } from '@/features/staff/hooks/use-staff'
import { StaffFormDialog } from '@/features/staff/components/staff-form-dialog'
import { StaffDetailsDialog } from '@/features/staff/components/staff-details-dialog'
import { ModuleImportDialog } from '@/features/shared/import-export/module-import-dialog'
import { ModuleExportDialog } from '@/features/shared/import-export/module-export-dialog'
import type { StaffListItem } from '@/features/staff/types/staff'
import { formatDate, toTitleCase } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'] as const
const ROLE_FILTERS = ['ALL', 'SECURITY', 'MAINTENANCE', 'CLEANING', 'ADMIN', 'OTHER'] as const

export default function StaffPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [role, setRole] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editStaff, setEditStaff] = useState<StaffListItem | null>(null)
  const [detailsStaff, setDetailsStaff] = useState<StaffListItem | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const canCreate = useHasPermission(PERMISSIONS.staffCreate)
  const canUpdate = useHasPermission(PERMISSIONS.staffUpdate)
  const canImport = useHasPermission(PERMISSIONS.staffImport)
  const canExport = useHasPermission(PERMISSIONS.staffExport)

  const { data, isLoading, isFetching } = useStaffList({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
    role: role === 'ALL' ? undefined : role,
  })

  const fullName = (row: StaffListItem) =>
    [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ')

  const columns: Column<StaffListItem>[] = [
    {
      key: 'name',
      header: 'Staff',
      cell: (row) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left"
          onClick={() => setDetailsStaff(row)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-medium">{fullName(row)}</p>
            <p className="text-xs text-muted-foreground">{row.staffNumber}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (row) => (
        <span className="text-muted-foreground">{toTitleCase(row.role)}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <span className="text-muted-foreground">{row.phoneNumber || row.email || '—'}</span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'hireDate',
      header: 'Hired',
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.hireDate ? formatDate(row.hireDate) : '—'}
        </span>
      ),
      hideBelow: 'lg',
    },
    {
      key: 'assignments',
      header: 'Assignments',
      cell: (row) => (
        <span className="text-muted-foreground">{row.maintenanceCount}</span>
      ),
      hideBelow: 'md',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
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
            onClick={() => setEditStaff(row)}
          >
            Edit
          </Button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Non-login personnel — guards, cleaners, and maintenance staff."
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
              Add staff
            </Button>
          ) : null}
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, number, or email…"
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
          value={role}
          onValueChange={(value) => {
            setRole(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'ALL' ? 'All roles' : toTitleCase(option)}
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
        emptyMessage="No staff members found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <StaffFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <StaffFormDialog
        open={Boolean(editStaff)}
        onOpenChange={(open) => !open && setEditStaff(null)}
        staff={editStaff}
      />
      {detailsStaff ? (
        <StaffDetailsDialog
          staff={detailsStaff}
          open
          onOpenChange={(open) => !open && setDetailsStaff(null)}
          onEdit={() => setEditStaff(detailsStaff)}
        />
      ) : null}
      <ModuleImportDialog open={importOpen} onOpenChange={setImportOpen} module="staff" entityLabel="Staff" />
      <ModuleExportDialog open={exportOpen} onOpenChange={setExportOpen} module="staff" entityLabel="Staff" />
    </div>
  )
}

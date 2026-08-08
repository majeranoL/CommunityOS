import { useState } from 'react'
import { Plus, Search, UserRound } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useUsers } from '@/features/users/hooks/use-users'
import { CreateUserDialog } from '@/features/users/components/create-user-dialog'
import { UserDetailsDialog } from '@/features/users/components/user-details-dialog'
import type { UserListItem } from '@/features/users/types/user'
import { formatDate } from '@/lib/format'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED'] as const

function formatHousehold(
  household: UserListItem['household'],
): { label: string; inactive: boolean } | null {
  if (!household) return null
  const parts = [household.block, household.lot, household.unit, household.address].filter(
    (part): part is string => Boolean(part),
  )
  return {
    label: parts.join(', ') || 'Unnamed unit',
    inactive: household.status !== 'ACTIVE',
  }
}

export default function UsersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const canCreate = useHasPermission(PERMISSIONS.userCreate)

  const { data, isLoading, isFetching } = useUsers({
    page,
    limit: 10,
    search: search || undefined,
    status: status === 'ALL' ? undefined : status,
  })

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (row) => (
        <button
          type="button"
          className="flex items-center gap-3 text-left hover:underline"
          onClick={() => setSelectedUserId(row.id)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="leading-tight">
            <p className="font-medium">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{row.referenceNumber}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
      hideBelow: 'md',
    },
    {
      key: 'roles',
      header: 'Role',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.map((role) => (
            <Badge key={role.id} variant="secondary">
              {role.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'household',
      header: 'Unit',
      cell: (row) => {
        const household = formatHousehold(row.household)
        if (!household) return <span className="text-muted-foreground">—</span>
        return (
          <span className={household.inactive ? 'text-muted-foreground' : undefined}>
            {household.label}
          </span>
        )
      },
      hideBelow: 'lg',
    },
    {
      key: 'createdAt',
      header: 'Joined',
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
      hideBelow: 'lg',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage residents and staff accounts in your community."
      >
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add user
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
                {option === 'ALL' ? 'All statuses' : option.charAt(0) + option.slice(1).toLowerCase()}
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
        emptyMessage="No users found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserDetailsDialog
        userId={selectedUserId}
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null)
        }}
      />
    </div>
  )
}

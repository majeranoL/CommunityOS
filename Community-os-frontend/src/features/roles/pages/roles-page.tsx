import { useState } from 'react'
import { Plus, Search, ShieldCheck, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import { DataTable, type Column } from '@/components/shared/data-table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteRole, useRolesList } from '@/features/roles/hooks/use-roles'
import { RoleFormDialog } from '@/features/roles/components/role-form-dialog'
import { RolePermissionsDialog } from '@/features/roles/components/role-permissions-dialog'
import type { RoleListItem } from '@/features/roles/types/role'

export default function RolesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RoleListItem | null>(null)
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<RoleListItem | null>(null)

  const { data, isLoading, isFetching } = useRolesList({
    page,
    limit: 10,
    search: search || undefined,
  })

  const deleteRole = useDeleteRole()

  const columns: Column<RoleListItem>[] = [
    {
      key: 'role',
      header: 'Role',
      cell: (row) => (
        <button
          type="button"
          className="text-left hover:underline"
          onClick={() => setPermissionsRoleId(row.id)}
        >
          <p className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            {row.name}
            {row.isSystem ? <Badge variant="secondary">System</Badge> : null}
          </p>
          {row.description ? (
            <p className="mt-0.5 max-w-md truncate text-xs text-muted-foreground">{row.description}</p>
          ) : null}
        </button>
      ),
    },
    {
      key: 'users',
      header: 'Users',
      cell: (row) => <span className="text-muted-foreground">{row.userCount}</span>,
      hideBelow: 'sm',
    },
    {
      key: 'permissions',
      header: 'Permissions',
      cell: (row) => <span className="text-muted-foreground">{row.permissionCount}</span>,
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
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPermissionsRoleId(row.id)}>
              <ShieldCheck className="h-4 w-4" />
              Permissions
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setEditing(row); setFormOpen(true) }}>
              Edit
            </DropdownMenuItem>
            {!row.isSystem && row.userCount === 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(row)}>
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
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="Manage office-holder roles and the permissions they grant."
      >
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4" />
          New role
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search roles…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        {isFetching ? <span className="text-xs text-muted-foreground">Updating…</span> : null}
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No roles found."
      />

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      <RoleFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        role={editing}
      />
      <RolePermissionsDialog
        roleId={permissionsRoleId}
        open={Boolean(permissionsRoleId)}
        onOpenChange={(open) => {
          if (!open) setPermissionsRoleId(null)
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete role?"
        description={`"${deleting?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={deleteRole.isPending}
        onConfirm={() => {
          if (deleting) deleteRole.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
        }}
      />
    </div>
  )
}

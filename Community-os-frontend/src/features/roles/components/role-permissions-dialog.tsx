import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Wand2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useAllPermissions, useAssignRolePermissions, useRole } from '@/features/roles/hooks/use-roles'
import { ROLE_TEMPLATES } from '@/features/roles/constants/role-templates'
import type { PermissionItem } from '@/features/roles/types/role'

interface RolePermissionsDialogProps {
  roleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ModuleGroup {
  module: string
  permissions: PermissionItem[]
}

function groupByModule(permissions: PermissionItem[]): ModuleGroup[] {
  const map = new Map<string, PermissionItem[]>()
  for (const permission of permissions) {
    const list = map.get(permission.module) ?? []
    list.push(permission)
    map.set(permission.module, list)
  }
  return Array.from(map.entries())
    .map(([module, items]) => ({ module, permissions: items }))
    .sort((a, b) => a.module.localeCompare(b.module))
}

export function RolePermissionsDialog({ roleId, open, onOpenChange }: RolePermissionsDialogProps) {
  const { data: role, isLoading: roleLoading } = useRole(roleId)
  const { data: catalog, isLoading: catalogLoading } = useAllPermissions()
  const assignPermissions = useAssignRolePermissions()

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const loading = roleLoading || catalogLoading

  useEffect(() => {
    if (open && role) {
      setSelected(new Set(role.permissions.map((permission) => permission.id)))
    }
  }, [open, role])

  const groups = useMemo(() => groupByModule(catalog ?? []), [catalog])

  const selectedCount = selected.size
  const totalCount = catalog?.length ?? 0

  const togglePermission = (permissionId: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(permissionId)
      else next.delete(permissionId)
      return next
    })
  }

  const toggleModule = (module: string, checked: boolean) => {
    const ids = groups.find((group) => group.module === module)?.permissions.map((permission) => permission.id) ?? []
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const applyTemplate = (permissionCodes: string[]) => {
    const codeToId = new Map((catalog ?? []).map((permission) => [permission.code, permission.id]))
    const ids = permissionCodes
      .map((code) => codeToId.get(code))
      .filter((id): id is string => Boolean(id))
    setSelected(new Set(ids))
  }

  const handleSave = () => {
    if (!roleId) return
    assignPermissions.mutate(
      { id: roleId, input: { permissionIds: Array.from(selected) } },
      {
        onSuccess: () => onOpenChange(false),
      },
    )
  }

  const moduleChecked = (module: string) => {
    const ids = groups.find((group) => group.module === module)?.permissions.map((permission) => permission.id) ?? []
    return ids.length > 0 && ids.every((id) => selected.has(id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
        <DialogHeader>
          <DialogTitle>Permissions — {role?.name ?? '…'}</DialogTitle>
          <DialogDescription>
            Check the permissions this role grants. Changes apply immediately on save.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Templates:</span>
          {ROLE_TEMPLATES.map((template) => (
            <Button
              key={template.key}
              type="button"
              variant="outline"
              size="sm"
              title={template.description}
              onClick={() => applyTemplate(template.permissionCodes)}
            >
              <Wand2 className="h-3.5 w-3.5" />
              {template.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear all
          </Button>
        </div>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {selectedCount} of {totalCount} permissions selected
        </div>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {groups.map((group) => {
                const checked = moduleChecked(group.module)
                return (
                  <div key={group.module}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`module-${group.module}`}
                          checked={checked}
                          onCheckedChange={(value) => toggleModule(group.module, value === true)}
                        />
                        <label
                          htmlFor={`module-${group.module}`}
                          className="text-sm font-semibold capitalize"
                        >
                          {group.module}
                        </label>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {group.permissions.filter((permission) => selected.has(permission.id)).length}/{group.permissions.length}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {group.permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 hover:bg-accent"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={selected.has(permission.id)}
                            onCheckedChange={(value) => togglePermission(permission.id, value === true)}
                          />
                          <div className="leading-tight">
                            <p className="text-xs font-medium">
                              {permission.code}
                              {selected.has(permission.id) ? (
                                <CheckCircle2 className="ml-1 inline h-3 w-3 text-primary" />
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{permission.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || assignPermissions.isPending}>
            {assignPermissions.isPending ? 'Saving…' : 'Save permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRoles, useUpdateUser, useUser } from '@/features/users/hooks/use-users'
import { PERMISSIONS } from '@/constants/permissions'
import { useHasPermission } from '@/store/auth-store'
import { useSecureImageUrl } from '@/components/shared/secure-image'
import { formatDate, initials } from '@/lib/format'

interface UserDetailsDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({ userId, open, onOpenChange }: UserDetailsDialogProps) {
  const { data: user, isLoading } = useUser(userId)
  const updateUser = useUpdateUser(() => onOpenChange(false))
  const updateRole = useUpdateUser()
  const canManageUsers = useHasPermission(PERMISSIONS.userUpdate)
  const { data: roles, isLoading: rolesLoading } = useRoles()

  const currentRoleId = user?.roles[0]?.id ?? ''
  const [selection, setSelection] = useState<{ userId: string | null; roleId: string }>({
    userId: null,
    roleId: '',
  })

  const selectedRoleId = selection.userId === userId ? selection.roleId : currentRoleId
  const selectRole = (roleId: string) => setSelection({ userId, roleId })

  const changeStatus = (status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'REJECTED') => {
    if (!userId) return
    updateUser.mutate({ id: userId, input: { status } })
  }

  const changeRole = () => {
    if (!userId || !selectedRoleId || selectedRoleId === currentRoleId) return
    updateRole.mutate({ id: userId, input: { roleId: selectedRoleId } })
  }

  const roleChanged = Boolean(selectedRoleId) && selectedRoleId !== currentRoleId
  const avatarUrl = useSecureImageUrl(user?.avatarUrl)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>{user?.referenceNumber}</DialogDescription>
        </DialogHeader>

        {isLoading || !user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{initials(user.firstName, user.lastName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {user.firstName} {user.middleName ? `${user.middleName} ` : ''}
                  {user.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  user.status === 'ACTIVE'
                    ? 'success'
                    : user.status === 'SUSPENDED' || user.status === 'REJECTED'
                      ? 'destructive'
                      : user.status === 'PENDING'
                        ? 'warning'
                        : 'muted'
                }
              >
                {user.status}
              </Badge>
              {user.roles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>

            <Separator />

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{user.phoneNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Joined</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
            </dl>

            {canManageUsers && roles && roles.length > 0 ? (
              <>
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <div className="flex items-center gap-2">
                    <Select value={selectedRoleId || undefined} onValueChange={selectRole}>
                      <SelectTrigger className="flex-1" disabled={rolesLoading}>
                        <SelectValue
                          placeholder={rolesLoading ? 'Loading roles…' : 'Select a role'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={changeRole}
                      disabled={!roleChanged || updateRole.isPending}
                    >
                      {updateRole.isPending ? 'Saving…' : 'Save role'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The community must always keep at least one active President.
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        <DialogFooter className="gap-2">
          {user?.status === 'PENDING' ? (
            <>
              <Button
                variant="outline"
                onClick={() => changeStatus('ACTIVE')}
                disabled={updateUser.isPending}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => changeStatus('REJECTED')}
                disabled={updateUser.isPending}
              >
                Deny
              </Button>
            </>
          ) : null}
          {user?.status === 'REJECTED' ? (
            <Button variant="outline" onClick={() => changeStatus('ACTIVE')} disabled={updateUser.isPending}>
              Approve
            </Button>
          ) : null}
          {user?.status === 'SUSPENDED' ? (
            <Button
              variant="outline"
              onClick={() => changeStatus('ACTIVE')}
              disabled={updateUser.isPending}
            >
              Reactivate
            </Button>
          ) : null}
          {user?.status === 'INACTIVE' ? (
            <Button variant="outline" onClick={() => changeStatus('ACTIVE')} disabled={updateUser.isPending}>
              Activate
            </Button>
          ) : null}
          {user?.status === 'ACTIVE' ? (
            <Button
              variant="outline"
              className="text-warning hover:text-warning"
              onClick={() => changeStatus('SUSPENDED')}
              disabled={updateUser.isPending}
            >
              Suspend
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

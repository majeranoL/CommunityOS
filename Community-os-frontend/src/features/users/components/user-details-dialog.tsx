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
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useUpdateUser, useUser } from '@/features/users/hooks/use-users'
import { formatDate, initials } from '@/lib/format'

interface UserDetailsDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailsDialog({ userId, open, onOpenChange }: UserDetailsDialogProps) {
  const { data: user, isLoading } = useUser(userId)
  const updateUser = useUpdateUser(() => onOpenChange(false))

  const changeStatus = (status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'REJECTED') => {
    if (!userId) return
    updateUser.mutate({ id: userId, input: { status } })
  }

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
                <AvatarImage src={user.avatarUrl ?? undefined} />
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

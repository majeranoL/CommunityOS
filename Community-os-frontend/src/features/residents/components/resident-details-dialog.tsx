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
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useSecureImageUrl } from '@/components/shared/secure-image'
import {
  useDeleteResident,
  useMoveOutResident,
  useResident,
  useUpdateResident,
} from '@/features/residents/hooks/use-residents'
import { formatDate, initials, toTitleCase } from '@/lib/format'

interface ResidentDetailsDialogProps {
  residentId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatHousehold(
  household: {
    block: string | null
    lot: string | null
    unit: string | null
    address: string | null
  } | null,
) {
  if (!household) return null
  return (
    [household.block, household.lot, household.unit, household.address]
      .filter(Boolean)
      .join(', ') || null
  )
}

export function ResidentDetailsDialog({
  residentId,
  open,
  onOpenChange,
}: ResidentDetailsDialogProps) {
  const { data: resident, isLoading } = useResident(residentId)
  const updateResident = useUpdateResident()
  const deleteResident = useDeleteResident(() => onOpenChange(false))
  const moveOutResident = useMoveOutResident(() => onOpenChange(false))
  const avatarUrl = useSecureImageUrl(resident?.profilePhotoUrl)
  const [confirmingMoveOut, setConfirmingMoveOut] = useState(false)

  const changeStatus = (status: 'ACTIVE' | 'INACTIVE') => {
    if (!residentId) return
    updateResident.mutate({ id: residentId, input: { status } })
  }

  const unitLabel = formatHousehold(resident?.household ?? null)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resident details</DialogTitle>
            <DialogDescription>{resident?.residentNumber}</DialogDescription>
          </DialogHeader>

          {isLoading || !resident ? (
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
                  <AvatarFallback>
                    {initials(resident.firstName, resident.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {resident.firstName}{' '}
                    {resident.middleName ? `${resident.middleName} ` : ''}
                    {resident.lastName}
                    {resident.suffix ? ` ${resident.suffix}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {resident.email || resident.phoneNumber || '—'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    resident.status === 'ACTIVE'
                      ? 'success'
                      : resident.status === 'MOVED_OUT'
                        ? 'muted'
                        : 'secondary'
                  }
                >
                  {resident.status}
                </Badge>
                {resident.gender ? (
                  <Badge variant="secondary">
                    {toTitleCase(resident.gender)}
                  </Badge>
                ) : null}
                {resident.civilStatus ? (
                  <Badge variant="secondary">
                    {toTitleCase(resident.civilStatus)}
                  </Badge>
                ) : null}
              </div>

              <Separator />

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Household</dt>
                  <dd>{unitLabel || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Household status</dt>
                  <dd>
                    {resident.household ? resident.household.status : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Birth date</dt>
                  <dd>{formatDate(resident.birthDate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>{resident.phoneNumber || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{resident.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd>{formatDate(resident.createdAt)}</dd>
                </div>
                {resident.status === 'MOVED_OUT' ? (
                  <div>
                    <dt className="text-muted-foreground">Moved out</dt>
                    <dd>{formatDate(resident.movedOutAt)}</dd>
                  </div>
                ) : null}
                {resident.remarks ? (
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Remarks</dt>
                    <dd>{resident.remarks}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          )}

          <DialogFooter className="gap-2">
            {resident?.status !== 'ACTIVE' ? (
              <Button
                variant="outline"
                onClick={() => changeStatus('ACTIVE')}
                disabled={updateResident.isPending}
              >
                Mark active
              </Button>
            ) : null}
            {resident?.status === 'ACTIVE' ? (
              <Button
                variant="outline"
                className="text-warning hover:text-warning"
                onClick={() => changeStatus('INACTIVE')}
                disabled={updateResident.isPending}
              >
                Mark inactive
              </Button>
            ) : null}
            {resident && resident.status !== 'MOVED_OUT' ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmingMoveOut(true)}
                disabled={moveOutResident.isPending}
              >
                Mark moved out
              </Button>
            ) : null}
            {resident ? (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove ${resident.firstName} ${resident.lastName}?`,
                    )
                  ) {
                    deleteResident.mutate(resident.id)
                  }
                }}
                disabled={deleteResident.isPending}
              >
                Remove
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmingMoveOut}
        onOpenChange={setConfirmingMoveOut}
        title={`Mark ${resident?.firstName ?? ''} ${resident?.lastName ?? ''} as moved out?`}
        description="Their account will be deactivated and the unit freed for reassignment. History is kept."
        confirmLabel="Mark moved out"
        destructive
        loading={moveOutResident.isPending}
        onConfirm={() => {
          if (residentId) moveOutResident.mutate(residentId)
        }}
      />
    </>
  )
}

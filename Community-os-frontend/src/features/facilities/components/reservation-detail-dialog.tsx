import { useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, MapPin, Trash2, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { StatusBadge } from '@/components/shared/status-badge'
import { useReservation, useReservationAction, useDeleteReservation } from '@/features/facilities/hooks/use-reservations'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { formatDateTime, toTitleCase } from '@/lib/format'

interface ReservationDetailDialogProps {
  reservationId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

export function ReservationDetailDialog({ reservationId, open, onOpenChange }: ReservationDetailDialogProps) {
  const { data: reservation, isLoading } = useReservation(reservationId)
  const [deleting, setDeleting] = useState(false)
  const action = useReservationAction()
  const deleteReservation = useDeleteReservation()

  const canApprove = useHasPermission(PERMISSIONS.reservationApprove)
  const canReject = useHasPermission(PERMISSIONS.reservationReject)
  const canCancel = useHasPermission(PERMISSIONS.reservationCancel)
  const canComplete = useHasPermission(PERMISSIONS.reservationComplete)
  const canDelete = useHasPermission(PERMISSIONS.reservationDelete)

  const status = reservation?.status

  const runAction = (next: 'approve' | 'reject' | 'cancel' | 'complete') => {
    if (reservation) action.mutate({ action: next, id: reservation.id })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isLoading ? 'Loading reservation…' : reservation?.purpose || 'Reservation'}</DialogTitle>
            <DialogDescription>
              {reservation ? `${reservation.facility.name} · ${reservation.resident.firstName} ${reservation.resident.lastName}` : ' '}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : reservation ? (
            <div className="space-y-4">
              <StatusBadge status={reservation.status} />

              <div className="space-y-2">
                <InfoRow label="Facility" value={reservation.facility.name} />
                <InfoRow label="Resident" value={`${reservation.resident.firstName} ${reservation.resident.lastName}`} />
                <InfoRow label="Purpose" value={reservation.purpose ?? '—'} />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDateTime(reservation.startAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDateTime(reservation.endAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{toTitleCase(reservation.facility.type)}</span>
                </div>
              </div>

              {reservation.remarks ? (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">{reservation.remarks}</p>
                </>
              ) : null}

              <Separator />

              <div className="flex flex-wrap gap-2">
                {status === 'PENDING' && canApprove ? (
                  <Button size="sm" onClick={() => runAction('approve')} disabled={action.isPending}>
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                ) : null}
                {status === 'PENDING' && canReject ? (
                  <Button size="sm" variant="outline" onClick={() => runAction('reject')} disabled={action.isPending}>
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                ) : null}
                {(status === 'PENDING' || status === 'APPROVED') && canCancel ? (
                  <Button size="sm" variant="outline" onClick={() => runAction('cancel')} disabled={action.isPending}>
                    Cancel reservation
                  </Button>
                ) : null}
                {status === 'APPROVED' && canComplete ? (
                  <Button size="sm" variant="outline" onClick={() => runAction('complete')} disabled={action.isPending}>
                    Mark completed
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive hover:text-destructive"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-start">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete reservation?"
        description="This reservation will be removed from the record."
        confirmLabel="Delete"
        destructive
        loading={deleteReservation.isPending}
        onConfirm={() => {
          if (reservation)
            deleteReservation.mutate(reservation.id, {
              onSuccess: () => {
                setDeleting(false)
                onOpenChange(false)
              },
            })
        }}
      />
    </>
  )
}

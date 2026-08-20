import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, Car, LogIn, LogOut, Phone, StickyNote, UserRound } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { useVisitor, useCheckInVisitor, useCheckOutVisitor } from '@/features/visitors/hooks/use-visitors'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { formatDateTime } from '@/lib/format'
import type { VisitorCategory } from '@/features/visitors/types/visitor'
import { QRCodePass } from './visitor-qr-pass'

const CATEGORY_LABELS: Record<VisitorCategory, string> = {
  ONE_TIME: 'One-time',
  RECURRING: 'Recurring',
  SERVICE_PROVIDER: 'Service Provider',
  CONTRACTOR: 'Contractor',
  DELIVERY: 'Delivery',
  OTHER: 'Other',
}

interface VisitorDetailDialogProps {
  visitorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisitorDetailDialog({ visitorId, open, onOpenChange }: VisitorDetailDialogProps) {
  const { data: visitor, isLoading } = useVisitor(visitorId)
  const checkIn = useCheckInVisitor()
  const checkOut = useCheckOutVisitor()
  const canCheckIn = useHasPermission(PERMISSIONS.visitorCheckIn)
  const canCheckOut = useHasPermission(PERMISSIONS.visitorCheckOut)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Visitor details</DialogTitle>
          <DialogDescription>
            {visitor?.hostResident
              ? `Visiting ${visitor.hostResident.firstName} ${visitor.hostResident.lastName}`
              : 'Gate visitor record'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !visitor ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={visitor.status} />
              <Badge variant="outline">{CATEGORY_LABELS[visitor.category] ?? visitor.category}</Badge>
            </div>

            <h3 className="text-lg font-semibold">{visitor.name}</h3>

            <Separator />

            <div className="space-y-2 text-sm">
              {visitor.phoneNumber ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {visitor.phoneNumber}
                </p>
              ) : null}
              {visitor.purpose ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <StickyNote className="h-4 w-4" />
                  {visitor.purpose}
                </p>
              ) : null}
              {visitor.hostResident ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  {visitor.hostResident.firstName} {visitor.hostResident.lastName}
                </p>
              ) : null}
              {visitor.vehicle ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-4 w-4" />
                  {visitor.vehicle.plateNumber}
                </p>
              ) : null}
              {visitor.entryAt ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <LogIn className="h-4 w-4" />
                  Entry: {formatDateTime(visitor.entryAt)}
                </p>
              ) : null}
              {visitor.exitAt ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <LogOut className="h-4 w-4" />
                  Exit: {formatDateTime(visitor.exitAt)}
                </p>
              ) : null}
              {!visitor.entryAt ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Created: {formatDateTime(visitor.createdAt)}
                </p>
              ) : null}
            </div>

            {visitor.remarks ? (
              <>
                <Separator />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{visitor.remarks}</p>
              </>
            ) : null}

            <Separator />

            <QRCodePass visitor={visitor} />

            <div className="flex gap-2">
              {visitor.status === 'EXPECTED' && canCheckIn ? (
                <Button
                  className="flex-1"
                  disabled={checkIn.isPending}
                  onClick={() => checkIn.mutate(visitor.id)}
                >
                  <LogIn className="h-4 w-4" />
                  Check in
                </Button>
              ) : null}
              {visitor.status === 'CHECKED_IN' && canCheckOut ? (
                <Button
                  className="flex-1"
                  disabled={checkOut.isPending}
                  onClick={() => checkOut.mutate(visitor.id)}
                >
                  <LogOut className="h-4 w-4" />
                  Check out
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

import { MapPin, Users, Wallet, Image as ImageIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { useFacility } from '@/features/facilities/hooks/use-facilities'
import { facilityTypes } from '@/features/facilities/validation/facility'
import { formatCurrency, formatNumber, toTitleCase } from '@/lib/format'

interface FacilityDetailDialogProps {
  facilityId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function FacilityDetailDialog({ facilityId, open, onOpenChange }: FacilityDetailDialogProps) {
  const { data: facility, isLoading } = useFacility(facilityId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isLoading ? 'Loading facility…' : facility?.name ?? 'Facility'}</DialogTitle>
          <DialogDescription>
            {isLoading ? ' ' : facility ? toTitleCase(facility.type) : ' '}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : facility ? (
          <div className="space-y-4">
            {facility.imageUrl ? (
              <img
                src={facility.imageUrl}
                alt={facility.name}
                className="h-40 w-full rounded-md border object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center rounded-md border bg-muted/40">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={facility.status} />
              <Badge variant="secondary">{toTitleCase(facility.type)}</Badge>
            </div>

            {facility.description ? <p className="text-sm text-muted-foreground">{facility.description}</p> : null}

            <Separator />

            <div className="space-y-3">
              {facility.location ? (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{facility.location}</span>
                </div>
              ) : null}
              {facility.capacity != null ? (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Capacity: {formatNumber(facility.capacity)}</span>
                </div>
              ) : null}
              {facility.hourlyRate != null ? (
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span>Hourly rate: {formatCurrency(facility.hourlyRate)}</span>
                </div>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2">
              <InfoRow label="Type" value={facilityTypes.find((option) => option.value === facility.type)?.label ?? facility.type} />
              <InfoRow label="Location" value={facility.location ?? '—'} />
              <InfoRow label="Capacity" value={facility.capacity != null ? formatNumber(facility.capacity) : '—'} />
              <InfoRow label="Hourly rate" value={facility.hourlyRate != null ? formatCurrency(facility.hourlyRate) : '—'} />
              <InfoRow label="Status" value={toTitleCase(facility.status)} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CalendarDays, MapPin, UserRound, Users, Check } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { useEvent, useRsvpEvent, useCancelRsvpEvent } from '@/features/events/hooks/use-events'
import { useAuthStore } from '@/store/auth-store'
import { formatDateTime } from '@/lib/format'
import type { EventCategory } from '@/features/events/types/event'

const CATEGORY_LABELS: Record<EventCategory, string> = {
  GENERAL: 'General',
  MEETING: 'Meeting',
  SOCIAL: 'Social',
  SPORTS: 'Sports',
  WORKSHOP: 'Workshop',
  FUNDRAISER: 'Fundraiser',
  OTHER: 'Other',
}

interface EventDetailDialogProps {
  eventId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EventDetailDialog({ eventId, open, onOpenChange }: EventDetailDialogProps) {
  const { data: event, isLoading } = useEvent(eventId)
  const rsvpEvent = useRsvpEvent()
  const cancelRsvpEvent = useCancelRsvpEvent()
  const user = useAuthStore((s) => s.user)

  const isRsvpd = Boolean(event?.attendees && event.attendees.length > 0)
  const attendeeCount = event?._count?.attendees ?? 0
  const canRsvp = user && event && event.status !== 'CANCELLED' && event.status !== 'COMPLETED'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Event details</DialogTitle>
          <DialogDescription>{event?.organizer ? `Organized by ${event.organizer.firstName} ${event.organizer.lastName}` : ''}</DialogDescription>
        </DialogHeader>

        {isLoading || !event ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {event.coverImageUrl ? (
              <img src={event.coverImageUrl} alt={event.title} className="h-40 w-full rounded-md object-cover" />
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              <Badge variant="outline">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
              {event.endAt && new Date(event.endAt) < new Date() && event.status !== 'CANCELLED' ? (
                <Badge variant="muted">Past</Badge>
              ) : null}
            </div>
            <h3 className="text-lg font-semibold">{event.title}</h3>
            <Separator />
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {formatDateTime(event.startAt)}
                {event.endAt ? ` – ${formatDateTime(event.endAt)}` : ''}
              </p>
              {event.location ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </p>
              ) : null}
              {event.organizer ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  {event.organizer.firstName} {event.organizer.lastName}
                </p>
              ) : null}
              <p className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                {attendeeCount} {attendeeCount === 1 ? 'attendee' : 'attendees'}
              </p>
            </div>

            {canRsvp ? (
              <>
                <Separator />
                <Button
                  variant={isRsvpd ? 'outline' : 'default'}
                  className="w-full"
                  disabled={rsvpEvent.isPending || cancelRsvpEvent.isPending}
                  onClick={() => {
                    if (isRsvpd) {
                      cancelRsvpEvent.mutate(event.id)
                    } else {
                      rsvpEvent.mutate(event.id)
                    }
                  }}
                >
                  {isRsvpd ? (
                    <>
                      <Check className="h-4 w-4" />
                      Attending
                    </>
                  ) : rsvpEvent.isPending ? (
                    'RSVPing…'
                  ) : (
                    'RSVP'
                  )}
                </Button>
              </>
            ) : null}

            {event.description ? (
              <>
                <Separator />
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{event.description}</p>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

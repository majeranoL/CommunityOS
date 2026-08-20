import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { eventsService } from '@/features/events/services/events'
import type { CreateEventInput, UpdateEventInput } from '@/features/events/types/event'
import type { ListQuery } from '@/types/api'

export const eventKeys = {
  all: ['events'] as const,
  list: (params: ListQuery) => ['events', 'list', params] as const,
  detail: (id: string) => ['events', 'detail', id] as const,
  attendees: (id: string) => ['events', 'attendees', id] as const,
}

export function useEvents(params: ListQuery) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => eventsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: eventKeys.detail(id ?? ''),
    queryFn: () => eventsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useEventAttendees(id: string | null) {
  return useQuery({
    queryKey: eventKeys.attendees(id ?? ''),
    queryFn: () => eventsService.getAttendees(id as string),
    enabled: Boolean(id),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: eventKeys.all })
}

export function useCreateEvent(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEventInput) => eventsService.create(input),
    onSuccess: () => {
      toast.success('Event created.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create event.')),
  })
}

export function useUpdateEvent(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventInput }) =>
      eventsService.update(id, input),
    onSuccess: () => {
      toast.success('Event updated.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update event.')),
  })
}

export function usePublishEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsService.publish(id),
    onSuccess: () => {
      toast.success('Event published.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to publish event.')),
  })
}

export function useCancelEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsService.cancel(id),
    onSuccess: () => {
      toast.success('Event cancelled.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to cancel event.')),
  })
}

export function useCompleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsService.complete(id),
    onSuccess: () => {
      toast.success('Event marked as completed.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to complete event.')),
  })
}

export function useDeleteEvent(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsService.remove(id),
    onSuccess: () => {
      toast.success('Event deleted.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete event.')),
  })
}

export function useRsvpEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsService.rsvp(id),
    onSuccess: () => {
      toast.success('RSVP confirmed!')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to RSVP.')),
  })
}

export function useCancelRsvpEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsService.cancelRsvp(id),
    onSuccess: () => {
      toast.success('RSVP cancelled.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to cancel RSVP.')),
  })
}

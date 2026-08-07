import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  reservationsService,
  type ReservationInput,
} from '@/features/facilities/services/reservations'

export const reservationKeys = {
  all: ['reservations'] as const,
  list: (params: unknown) => ['reservations', 'list', params] as const,
  detail: (id: string) => ['reservations', 'detail', id] as const,
}

export function useReservations(params: Parameters<typeof reservationsService.list>[0] = {}) {
  return useQuery({
    queryKey: reservationKeys.list(params),
    queryFn: () => reservationsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useReservation(id: string | null) {
  return useQuery({
    queryKey: reservationKeys.detail(id ?? ''),
    queryFn: () => reservationsService.get(id as string),
    enabled: Boolean(id),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: reservationKeys.all })
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCreateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReservationInput) => reservationsService.create(input),
    onSuccess: () => {
      toast.success('Reservation submitted.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create reservation.')),
  })
}

export function useUpdateReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ReservationInput> }) =>
      reservationsService.update(id, input),
    onSuccess: () => {
      toast.success('Reservation updated.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update reservation.')),
  })
}

export function useDeleteReservation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reservationsService.remove(id),
    onSuccess: () => {
      toast.success('Reservation deleted.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete reservation.')),
  })
}

export function useReservationAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      action,
      id,
    }: {
      action: 'approve' | 'reject' | 'cancel' | 'complete'
      id: string
    }) => reservationsService[action](id),
    onSuccess: () => {
      toast.success('Reservation updated.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update reservation.')),
  })
}

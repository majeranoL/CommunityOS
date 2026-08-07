import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { facilitiesService, type FacilityInput } from '@/features/facilities/services/facilities'

export const facilityKeys = {
  all: ['facilities'] as const,
  list: (params: unknown) => ['facilities', 'list', params] as const,
  detail: (id: string) => ['facilities', 'detail', id] as const,
}

export function useFacilities(params: Parameters<typeof facilitiesService.list>[0] = {}) {
  return useQuery({
    queryKey: facilityKeys.list(params),
    queryFn: () => facilitiesService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useFacility(id: string | null) {
  return useQuery({
    queryKey: facilityKeys.detail(id ?? ''),
    queryFn: () => facilitiesService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FacilityInput) => facilitiesService.create(input),
    onSuccess: () => {
      toast.success('Facility created.')
      queryClient.invalidateQueries({ queryKey: facilityKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create facility.')),
  })
}

export function useUpdateFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FacilityInput> }) =>
      facilitiesService.update(id, input),
    onSuccess: () => {
      toast.success('Facility updated.')
      queryClient.invalidateQueries({ queryKey: facilityKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update facility.')),
  })
}

export function useDeleteFacility() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => facilitiesService.remove(id),
    onSuccess: () => {
      toast.success('Facility deleted.')
      queryClient.invalidateQueries({ queryKey: facilityKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete facility.')),
  })
}

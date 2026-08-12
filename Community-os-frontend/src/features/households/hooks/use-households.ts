import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { householdsService } from '@/features/households/services/households'
import type {
  CreateHouseholdInput,
  UpdateHouseholdInput,
} from '@/features/households/types/household'
import type { ListQuery } from '@/types/api'

export const householdKeys = {
  all: ['households'] as const,
  list: (params: ListQuery) => ['households', 'list', params] as const,
  detail: (id: string) => ['households', 'detail', id] as const,
  me: ['households', 'me'] as const,
}

export function useHouseholds(params: ListQuery) {
  return useQuery({
    queryKey: householdKeys.list(params),
    queryFn: () => householdsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useHousehold(id: string | null) {
  return useQuery({
    queryKey: householdKeys.detail(id ?? ''),
    queryFn: () => householdsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useMyHousehold() {
  return useQuery({
    queryKey: householdKeys.me,
    queryFn: () => householdsService.me(),
  })
}

export function useCreateHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHouseholdInput) =>
      householdsService.create(input),
    onSuccess: () => {
      toast.success('Household added.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to add household.')),
  })
}

export function useUpdateHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateHouseholdInput }) =>
      householdsService.update(id, input),
    onSuccess: () => {
      toast.success('Household updated.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to update household.')),
  })
}

export function useDeleteHousehold(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => householdsService.remove(id),
    onSuccess: () => {
      toast.success('Household removed.')
      queryClient.invalidateQueries({ queryKey: householdKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to remove household.')),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { petsService } from '@/features/pets/services/pets'
import type {
  CreatePetInput,
  UpdatePetInput,
  VerifyPetInput,
} from '@/features/pets/types/pet'
import type { ListQuery } from '@/types/api'

export const petKeys = {
  all: ['pets'] as const,
  list: (params: ListQuery) => ['pets', 'list', params] as const,
  detail: (id: string) => ['pets', 'detail', id] as const,
}

export function usePets(params: ListQuery) {
  return useQuery({
    queryKey: petKeys.list(params),
    queryFn: () => petsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function usePet(id: string | null) {
  return useQuery({
    queryKey: petKeys.detail(id ?? ''),
    queryFn: () => petsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreatePet(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePetInput) => petsService.create(input),
    onSuccess: () => {
      toast.success('Pet registered.')
      queryClient.invalidateQueries({ queryKey: petKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to register pet.')),
  })
}

export function useUpdatePet(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePetInput }) =>
      petsService.update(id, input),
    onSuccess: () => {
      toast.success('Pet updated.')
      queryClient.invalidateQueries({ queryKey: petKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update pet.')),
  })
}

export function useDeletePet(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => petsService.remove(id),
    onSuccess: () => {
      toast.success('Pet removed.')
      queryClient.invalidateQueries({ queryKey: petKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove pet.')),
  })
}

export function useVerifyPet(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VerifyPetInput }) =>
      petsService.verify(id, input),
    onSuccess: () => {
      toast.success('Pet verification updated.')
      queryClient.invalidateQueries({ queryKey: petKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to verify pet.')),
  })
}

export function useDeactivatePet(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => petsService.deactivate(id),
    onSuccess: () => {
      toast.success('Pet deactivated.')
      queryClient.invalidateQueries({ queryKey: petKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to deactivate pet.')),
  })
}

export function useRevalidatePet(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => petsService.revalidate(id),
    onSuccess: () => {
      toast.success('Pet revalidated.')
      queryClient.invalidateQueries({ queryKey: petKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to revalidate pet.')),
  })
}

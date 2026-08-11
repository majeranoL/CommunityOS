import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { residentsService } from '@/features/residents/services/residents'
import type {
  CreateResidentInput,
  UpdateResidentInput,
} from '@/features/residents/types/resident'
import type { ListQuery } from '@/types/api'

export const residentKeys = {
  all: ['residents'] as const,
  list: (params: ListQuery) => ['residents', 'list', params] as const,
  detail: (id: string) => ['residents', 'detail', id] as const,
}

export function useResidents(params: ListQuery) {
  return useQuery({
    queryKey: residentKeys.list(params),
    queryFn: () => residentsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useResident(id: string | null) {
  return useQuery({
    queryKey: residentKeys.detail(id ?? ''),
    queryFn: () => residentsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateResident(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateResidentInput) => residentsService.create(input),
    onSuccess: () => {
      toast.success('Resident added.')
      queryClient.invalidateQueries({ queryKey: residentKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to add resident.')),
  })
}

export function useUpdateResident(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateResidentInput }) =>
      residentsService.update(id, input),
    onSuccess: () => {
      toast.success('Resident updated.')
      queryClient.invalidateQueries({ queryKey: residentKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to update resident.')),
  })
}

export function useDeleteResident(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => residentsService.remove(id),
    onSuccess: () => {
      toast.success('Resident removed.')
      queryClient.invalidateQueries({ queryKey: residentKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to remove resident.')),
  })
}

export function useMoveOutResident(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => residentsService.moveOut(id),
    onSuccess: () => {
      toast.success('Resident marked as moved out.')
      queryClient.invalidateQueries({ queryKey: residentKeys.all })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(
        apiErrorMessage(error, 'Failed to mark resident as moved out.'),
      ),
  })
}

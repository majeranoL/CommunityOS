import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { staffService } from '@/features/staff/services/staff'
import type { CreateStaffInput, UpdateStaffInput } from '@/features/staff/types/staff'
import type { ListQuery } from '@/types/api'

export const staffKeys = {
  all: ['staff'] as const,
  list: (params: ListQuery) => ['staff', 'list', params] as const,
  detail: (id: string) => ['staff', 'detail', id] as const,
}

export function useStaffList(params: ListQuery) {
  return useQuery({
    queryKey: staffKeys.list(params),
    queryFn: () => staffService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useStaff(id: string | null) {
  return useQuery({
    queryKey: staffKeys.detail(id ?? ''),
    queryFn: () => staffService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateStaff(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStaffInput) => staffService.create(input),
    onSuccess: () => {
      toast.success('Staff member added.')
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add staff member.')),
  })
}

export function useUpdateStaff(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStaffInput }) =>
      staffService.update(id, input),
    onSuccess: () => {
      toast.success('Staff member updated.')
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update staff member.')),
  })
}

export function useDeleteStaff(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => staffService.remove(id),
    onSuccess: () => {
      toast.success('Staff member removed.')
      queryClient.invalidateQueries({ queryKey: staffKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to remove staff member.')),
  })
}

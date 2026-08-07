import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { complaintsService } from '@/features/complaints/services/complaints'
import type {
  CreateComplaintInput,
  UpdateComplaintInput,
} from '@/features/complaints/types/complaint'
import type { ListQuery } from '@/types/api'

export const complaintKeys = {
  all: ['complaints'] as const,
  list: (params: ListQuery) => ['complaints', 'list', params] as const,
  detail: (id: string) => ['complaints', 'detail', id] as const,
}

export function useComplaints(params: ListQuery) {
  return useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => complaintsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useComplaint(id: string | null) {
  return useQuery({
    queryKey: complaintKeys.detail(id ?? ''),
    queryFn: () => complaintsService.get(id as string),
    enabled: Boolean(id),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: complaintKeys.all })
}

export function useCreateComplaint(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateComplaintInput) => complaintsService.create(input),
    onSuccess: () => {
      toast.success('Complaint submitted.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to submit complaint.')),
  })
}

export function useUpdateComplaint(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateComplaintInput }) =>
      complaintsService.update(id, input),
    onSuccess: () => {
      toast.success('Complaint updated.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update complaint.')),
  })
}

export function useAssignComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) =>
      complaintsService.assign(id, assignedToId),
    onSuccess: () => {
      toast.success('Complaint assigned.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to assign complaint.')),
  })
}

export function useResolveComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, resolutionRemarks }: { id: string; resolutionRemarks?: string }) =>
      complaintsService.resolve(id, resolutionRemarks),
    onSuccess: () => {
      toast.success('Complaint marked as resolved.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to resolve complaint.')),
  })
}

export function useCloseComplaint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => complaintsService.close(id),
    onSuccess: () => {
      toast.success('Complaint closed.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to close complaint.')),
  })
}

export function useDeleteComplaint(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => complaintsService.remove(id),
    onSuccess: () => {
      toast.success('Complaint deleted.')
      invalidateAll(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete complaint.')),
  })
}

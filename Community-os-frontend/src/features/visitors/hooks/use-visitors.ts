import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { visitorsService } from '@/features/visitors/services/visitors'
import type { CreateVisitorInput, VisitorListItem } from '@/features/visitors/types/visitor'
import type { ListQuery } from '@/types/api'

export const visitorKeys = {
  all: ['visitors'] as const,
  list: (params: ListQuery) => ['visitors', 'list', params] as const,
  detail: (id: string) => ['visitors', 'detail', id] as const,
}

export function useVisitors(params: ListQuery) {
  return useQuery({
    queryKey: visitorKeys.list(params),
    queryFn: () => visitorsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useVisitor(id: string | null) {
  return useQuery({
    queryKey: visitorKeys.detail(id ?? ''),
    queryFn: () => visitorsService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateVisitor(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVisitorInput) => visitorsService.create(input),
    onSuccess: () => {
      toast.success('Visitor added.')
      queryClient.invalidateQueries({ queryKey: visitorKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add visitor.')),
  })
}

function useVisitorAction(
  action: (id: string) => Promise<VisitorListItem>,
  message: string,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => action(id),
    onSuccess: () => {
      toast.success(message)
      queryClient.invalidateQueries({ queryKey: visitorKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Action failed.')),
  })
}

export function useCheckInVisitor(onSuccess?: () => void) {
  return useVisitorAction((id) => visitorsService.checkIn(id), 'Visitor checked in.', onSuccess)
}

export function useCheckOutVisitor(onSuccess?: () => void) {
  return useVisitorAction((id) => visitorsService.checkOut(id), 'Visitor checked out.', onSuccess)
}

export function useCancelVisitor(onSuccess?: () => void) {
  return useVisitorAction((id) => visitorsService.cancel(id), 'Visit cancelled.', onSuccess)
}

export function useDeleteVisitor(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => visitorsService.remove(id),
    onSuccess: () => {
      toast.success('Visitor deleted.')
      queryClient.invalidateQueries({ queryKey: visitorKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete visitor.')),
  })
}

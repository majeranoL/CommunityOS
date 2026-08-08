import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { plansService, type PlanListParams } from '@/features/admin/services/plans'
import type { AdminPlanInput } from '@/features/admin/types/plan'

export const planKeys = {
  all: ['admin', 'plans'] as const,
  list: (params: unknown) => ['admin', 'plans', 'list', params] as const,
}

export function usePlans(params: PlanListParams = {}) {
  return useQuery({
    queryKey: planKeys.list(params),
    queryFn: () => plansService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AdminPlanInput) => plansService.create(input),
    onSuccess: () => {
      toast.success('Plan created.')
      queryClient.invalidateQueries({ queryKey: planKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create plan.')),
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AdminPlanInput> }) =>
      plansService.update(id, input),
    onSuccess: () => {
      toast.success('Plan updated.')
      queryClient.invalidateQueries({ queryKey: planKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update plan.')),
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => plansService.remove(id),
    onSuccess: () => {
      toast.success('Plan deleted.')
      queryClient.invalidateQueries({ queryKey: planKeys.all })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete plan.')),
  })
}

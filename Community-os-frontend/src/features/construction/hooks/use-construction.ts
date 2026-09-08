import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { constructionService, type CreateConstructionInput } from '@/features/construction/services/construction'

const keys = ['construction-requests'] as const

export function useConstructionRequests() {
  return useQuery({ queryKey: keys, queryFn: () => constructionService.list() })
}

export function useConstructionRequirements() {
  return useQuery({ queryKey: ['construction-requirements'], queryFn: constructionService.requirements })
}

export function useCreateConstructionRequirement() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; description?: string; isRequired?: boolean }) => constructionService.createRequirement(input),
    onSuccess: () => {
      toast.success('Document requirement added.')
      client.invalidateQueries({ queryKey: ['construction-requirements'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to add document requirement.')),
  })
}

function useConstructionMutation<T>(mutationFn: (value: T) => Promise<unknown>, message: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(message)
      client.invalidateQueries({ queryKey: keys })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Construction request action failed.')),
  })
}

export function useCreateConstructionRequest() {
  return useConstructionMutation<CreateConstructionInput>(constructionService.create, 'Construction request submitted.')
}

export function useReviewConstructionRequest() {
  return useConstructionMutation<{ id: string; status: 'APPROVED' | 'REJECTED'; notes?: string }>(
    ({ id, status, notes }) => constructionService.review(id, status, notes),
    'Construction request reviewed.',
  )
}

export function useCompleteConstructionRequest() {
  return useConstructionMutation<string>(constructionService.complete, 'Construction request marked completed.')
}

export function useCloseConstructionRequest() {
  return useConstructionMutation<string>(constructionService.close, 'Construction request closed.')
}

export function useCancelConstructionRequest() {
  return useConstructionMutation<string>(constructionService.cancel, 'Construction request cancelled.')
}

export function useResolveConstructionBond() {
  return useConstructionMutation<{ id: string; status: 'REFUNDED' | 'FORFEITED'; notes: string }>(
    ({ id, status, notes }) => constructionService.resolveBond(id, status, notes),
    'Construction bond resolved.',
  )
}

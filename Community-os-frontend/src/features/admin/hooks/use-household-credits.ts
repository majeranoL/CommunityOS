import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  adminHouseholdCreditsService,
  type AdminHouseholdCreditIssueInput,
} from '@/features/admin/services/household-credits'

export const adminHouseholdCreditsKeys = {
  all: ['admin', 'household-credits'] as const,
  list: (params: object) => ['admin', 'household-credits', params] as const,
}

export function useAdminHouseholdCredits(params: {
  communityId?: string
  householdId?: string
} = {}) {
  return useQuery({
    queryKey: adminHouseholdCreditsKeys.list(params),
    queryFn: () => adminHouseholdCreditsService.list(params),
  })
}

export function useAdminHouseholds(communityId: string) {
  return useQuery({
    queryKey: ['admin', 'households', communityId] as const,
    queryFn: () => adminHouseholdCreditsService.households(communityId),
    enabled: Boolean(communityId),
  })
}

function useInvalidateCredits() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: adminHouseholdCreditsKeys.all })
}

export function useAdminIssueHouseholdCredit() {
  const invalidate = useInvalidateCredits()
  return useMutation({
    mutationFn: (input: AdminHouseholdCreditIssueInput) =>
      adminHouseholdCreditsService.issue(input),
    onSuccess: () => {
      toast.success('Household credit issued.')
      invalidate()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to issue household credit.')),
  })
}

export function useAdminAdjustHouseholdCredit() {
  const invalidate = useInvalidateCredits()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      adminHouseholdCreditsService.adjust(id, amount),
    onSuccess: () => {
      toast.success('Household credit updated.')
      invalidate()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to update household credit.')),
  })
}

export function useAdminVoidHouseholdCredit() {
  const invalidate = useInvalidateCredits()
  return useMutation({
    mutationFn: (id: string) => adminHouseholdCreditsService.void(id),
    onSuccess: () => {
      toast.success('Household credit voided.')
      invalidate()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to void household credit.')),
  })
}

export function useAdminApplyHouseholdCredit() {
  const invalidate = useInvalidateCredits()
  return useMutation({
    mutationFn: (input: Parameters<typeof adminHouseholdCreditsService.apply>[0]) =>
      adminHouseholdCreditsService.apply(input),
    onSuccess: () => {
      toast.success('Household credit applied.')
      invalidate()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to apply household credit.')),
  })
}
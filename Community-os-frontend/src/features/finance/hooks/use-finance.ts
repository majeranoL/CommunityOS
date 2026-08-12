import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import type { ListQuery } from '@/types/api'
import {
  assessmentsService,
  financeHouseholdsService,
  financeResidentsService,
  paymentsService,
} from '@/features/finance/services/finance'
import type {
  CreateAssessmentInput,
  CreatePaymentInput,
  GenerateAssessmentsInput,
  UpdateAssessmentInput,
  UpdatePaymentInput,
} from '@/features/finance/types/finance'

export const financeKeys = {
  assessments: ['finance', 'assessments'] as const,
  assessmentList: (params: ListQuery) => ['finance', 'assessments', 'list', params] as const,
  assessmentDetail: (id: string) => ['finance', 'assessments', 'detail', id] as const,
  payments: ['finance', 'payments'] as const,
  paymentList: (params: ListQuery) => ['finance', 'payments', 'list', params] as const,
  paymentDetail: (id: string) => ['finance', 'payments', 'detail', id] as const,
  households: ['finance', 'households'] as const,
}

// ==============================================
// Assessments
// ==============================================

export function useAssessments(params: ListQuery) {
  return useQuery({
    queryKey: financeKeys.assessmentList(params),
    queryFn: () => assessmentsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useAssessment(id: string | null) {
  return useQuery({
    queryKey: financeKeys.assessmentDetail(id ?? ''),
    queryFn: () => assessmentsService.get(id as string),
    enabled: Boolean(id),
  })
}

function invalidateAssessments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.assessments })
}

export function useCreateAssessment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAssessmentInput) => assessmentsService.create(input),
    onSuccess: () => {
      toast.success('Assessment created.')
      invalidateAssessments(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create assessment.')),
  })
}

export function useUpdateAssessment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssessmentInput }) =>
      assessmentsService.update(id, input),
    onSuccess: () => {
      toast.success('Assessment updated.')
      invalidateAssessments(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update assessment.')),
  })
}

export function useIssueAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assessmentsService.issue(id),
    onSuccess: () => {
      toast.success('Assessment issued.')
      invalidateAssessments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to issue assessment.')),
  })
}

export function useCancelAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assessmentsService.cancel(id),
    onSuccess: () => {
      toast.success('Assessment cancelled.')
      invalidateAssessments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to cancel assessment.')),
  })
}

export function useDeleteAssessment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assessmentsService.remove(id),
    onSuccess: () => {
      toast.success('Assessment deleted.')
      invalidateAssessments(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete assessment.')),
  })
}

export function useGenerateAssessments(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateAssessmentsInput) => assessmentsService.generate(input),
    onSuccess: (result) => {
      toast.success(
        result.skippedCount > 0
          ? `Created ${result.createdCount} assessments (${result.skippedCount} skipped).`
          : `Created ${result.createdCount} assessments.`,
      )
      invalidateAssessments(queryClient)
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to generate assessments.')),
  })
}

// ==============================================
// Payments
// ==============================================

export function usePayments(params: ListQuery) {
  return useQuery({
    queryKey: financeKeys.paymentList(params),
    queryFn: () => paymentsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function usePayment(id: string | null) {
  return useQuery({
    queryKey: financeKeys.paymentDetail(id ?? ''),
    queryFn: () => paymentsService.get(id as string),
    enabled: Boolean(id),
  })
}

function invalidatePayments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.payments })
  queryClient.invalidateQueries({ queryKey: financeKeys.assessments })
}

export function useCreatePayment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => paymentsService.create(input),
    onSuccess: () => {
      toast.success('Payment recorded.')
      invalidatePayments(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to record payment.')),
  })
}

export function useUpdatePayment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePaymentInput }) =>
      paymentsService.update(id, input),
    onSuccess: () => {
      toast.success('Payment updated.')
      invalidatePayments(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update payment.')),
  })
}

export function useConfirmPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.confirm(id),
    onSuccess: () => {
      toast.success('Payment confirmed.')
      invalidatePayments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to confirm payment.')),
  })
}

export function useRejectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.reject(id),
    onSuccess: () => {
      toast.success('Payment rejected.')
      invalidatePayments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to reject payment.')),
  })
}

export function useRefundPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.refund(id),
    onSuccess: () => {
      toast.success('Payment refunded.')
      invalidatePayments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to refund payment.')),
  })
}

export function useDeletePayment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.remove(id),
    onSuccess: () => {
      toast.success('Payment deleted.')
      invalidatePayments(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete payment.')),
  })
}

// ==============================================
// Pickers
// ==============================================

export function useHouseholdOptions(search: string) {
  return useQuery({
    queryKey: [...financeKeys.households, search] as const,
    queryFn: () => financeHouseholdsService.options({ search: search || undefined, limit: 50 }),
  })
}

export function useFinanceResidentOptions(search: string) {
  return useQuery({
    queryKey: ['finance', 'residents', search] as const,
    queryFn: () => financeResidentsService.options({ search: search || undefined, limit: 25 }),
  })
}

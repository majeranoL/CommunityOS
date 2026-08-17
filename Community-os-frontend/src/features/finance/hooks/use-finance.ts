import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import type { ListQuery } from '@/types/api'
import {
  assessmentsService,
  billingPeriodsService,
  chargeTypesService,
  expensesService,
  financeHouseholdsService,
  financeImportExportService,
  financeResidentsService,
  financeTransactionsService,
  incomeStatementService,
  paymentsService,
} from '@/features/finance/services/finance'
import type {
  CreateAssessmentInput,
  CreateBillingPeriodInput,
  CreateChargeTypeInput,
  CreateExpenseInput,
  CreatePaymentInput,
  GenerateAssessmentsInput,
  GenerateBillingPeriodsInput,
  ImportKind,
  UpdateAssessmentInput,
  UpdateChargeTypeInput,
  UpdateExpenseInput,
  UpdatePaymentInput,
} from '@/features/finance/types/finance'

export const financeKeys = {
  assessments: ['finance', 'assessments'] as const,
  assessmentList: (params: ListQuery) => ['finance', 'assessments', 'list', params] as const,
  assessmentDetail: (id: string) => ['finance', 'assessments', 'detail', id] as const,
  payments: ['finance', 'payments'] as const,
  paymentList: (params: ListQuery) => ['finance', 'payments', 'list', params] as const,
  paymentDetail: (id: string) => ['finance', 'payments', 'detail', id] as const,
  chargeTypes: ['finance', 'charge-types'] as const,
  chargeTypeList: (params: ListQuery) => ['finance', 'charge-types', 'list', params] as const,
  billingPeriods: ['finance', 'billing-periods'] as const,
  billingPeriodList: (params: ListQuery) => ['finance', 'billing-periods', 'list', params] as const,
  transactions: ['finance', 'transactions'] as const,
  transactionList: (params: ListQuery) => ['finance', 'transactions', 'list', params] as const,
  importBatches: ['finance', 'import-batches'] as const,
  households: ['finance', 'households'] as const,
  duesTracker: ['finance', 'dues-tracker'] as const,
  expenses: ['finance', 'expenses'] as const,
  expenseList: (params: ListQuery) => ['finance', 'expenses', 'list', params] as const,
  incomeStatement: ['finance', 'income-statement'] as const,
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

export function useDuesTracker(months: number) {
  return useQuery({
    queryKey: [...financeKeys.duesTracker, months] as const,
    queryFn: () => assessmentsService.duesTracker({ months }),
    placeholderData: (previous) => previous,
  })
}

function invalidateAssessments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.assessments })
  queryClient.invalidateQueries({ queryKey: financeKeys.duesTracker })
  queryClient.invalidateQueries({ queryKey: financeKeys.billingPeriods })
  queryClient.invalidateQueries({ queryKey: financeKeys.transactions })
  queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
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

export function useWaiveAssessment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => assessmentsService.waive(id),
    onSuccess: () => {
      toast.success('Assessment waived.')
      invalidateAssessments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to waive assessment.')),
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

export function usePaymentReceipt(id: string | null) {
  return useQuery({
    queryKey: [...financeKeys.paymentDetail(id ?? ''), 'receipt'] as const,
    queryFn: () => paymentsService.receipt(id as string),
    enabled: Boolean(id),
  })
}

function invalidatePayments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.payments })
  queryClient.invalidateQueries({ queryKey: financeKeys.assessments })
  queryClient.invalidateQueries({ queryKey: financeKeys.duesTracker })
  queryClient.invalidateQueries({ queryKey: financeKeys.billingPeriods })
  queryClient.invalidateQueries({ queryKey: financeKeys.transactions })
  queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
}

export function useCreatePayment(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => paymentsService.create(input),
    onSuccess: () => {
      toast.success('Payment recorded and awaiting verification.')
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

export function useVerifyPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.verify(id),
    onSuccess: () => {
      toast.success('Payment verified and allocated.')
      invalidatePayments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to verify payment.')),
  })
}

export function useRejectPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsService.reject(id, reason),
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

export function useCancelPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => paymentsService.cancel(id),
    onSuccess: () => {
      toast.success('Payment cancelled.')
      invalidatePayments(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to cancel payment.')),
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
// Charge types
// ==============================================

export function useChargeTypes(params: ListQuery) {
  return useQuery({
    queryKey: financeKeys.chargeTypeList(params),
    queryFn: () => chargeTypesService.list(params),
    placeholderData: (previous) => previous,
  })
}

function invalidateChargeTypes(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.chargeTypes })
  queryClient.invalidateQueries({ queryKey: financeKeys.billingPeriods })
}

export function useCreateChargeType(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChargeTypeInput) => chargeTypesService.create(input),
    onSuccess: () => {
      toast.success('Charge type created.')
      invalidateChargeTypes(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create charge type.')),
  })
}

export function useUpdateChargeType(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateChargeTypeInput }) =>
      chargeTypesService.update(id, input),
    onSuccess: () => {
      toast.success('Charge type updated.')
      invalidateChargeTypes(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update charge type.')),
  })
}

export function useDeleteChargeType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => chargeTypesService.remove(id),
    onSuccess: () => {
      toast.success('Charge type deleted.')
      invalidateChargeTypes(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete charge type.')),
  })
}

// ==============================================
// Billing periods
// ==============================================

export function useBillingPeriods(params: ListQuery) {
  return useQuery({
    queryKey: financeKeys.billingPeriodList(params),
    queryFn: () => billingPeriodsService.list(params),
    placeholderData: (previous) => previous,
  })
}

function invalidateBillingPeriods(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.billingPeriods })
  queryClient.invalidateQueries({ queryKey: financeKeys.assessments })
}

export function useCreateBillingPeriod(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBillingPeriodInput) => billingPeriodsService.create(input),
    onSuccess: () => {
      toast.success('Billing period created.')
      invalidateBillingPeriods(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create billing period.')),
  })
}

export function useGenerateBillingPeriods(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateBillingPeriodsInput) => billingPeriodsService.generate(input),
    onSuccess: (result) => {
      toast.success(`Generated ${result.createdCount} billing period${result.createdCount === 1 ? '' : 's'}.`)
      invalidateBillingPeriods(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to generate billing periods.')),
  })
}

export function useUpdateBillingPeriod(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateBillingPeriodInput> }) =>
      billingPeriodsService.update(id, input),
    onSuccess: () => {
      toast.success('Billing period updated.')
      invalidateBillingPeriods(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update billing period.')),
  })
}

export function useDeleteBillingPeriod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => billingPeriodsService.remove(id),
    onSuccess: () => {
      toast.success('Billing period deleted.')
      invalidateBillingPeriods(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete billing period.')),
  })
}

// ==============================================
// Transactions (ledger)
// ==============================================

export function useFinanceTransactions(params: ListQuery) {
  return useQuery({
    queryKey: financeKeys.transactionList(params),
    queryFn: () => financeTransactionsService.list(params),
    placeholderData: (previous) => previous,
  })
}

// ==============================================
// Expenses
// ==============================================

export function useExpenses(params: ListQuery) {
  return useQuery({
    queryKey: financeKeys.expenseList(params),
    queryFn: () => expensesService.list(params),
    placeholderData: (previous) => previous,
  })
}

function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: financeKeys.expenses })
  queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
  queryClient.invalidateQueries({ queryKey: financeKeys.transactions })
}

export function useCreateExpense(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expensesService.create(input),
    onSuccess: () => {
      toast.success('Expense recorded.')
      invalidateExpenses(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to record expense.')),
  })
}

export function useUpdateExpense(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      expensesService.update(id, input),
    onSuccess: () => {
      toast.success('Expense updated.')
      invalidateExpenses(queryClient)
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update expense.')),
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesService.remove(id),
    onSuccess: () => {
      toast.success('Expense deleted.')
      invalidateExpenses(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete expense.')),
  })
}

// ==============================================
// Income statement (fund transparency)
// ==============================================

export function useIncomeStatement(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: [...financeKeys.incomeStatement, params] as const,
    queryFn: () => incomeStatementService.get(params),
    placeholderData: (previous) => previous,
  })
}

// ==============================================
// Import / export
// ==============================================

export function useImportBatches() {
  return useQuery({
    queryKey: financeKeys.importBatches,
    queryFn: () => financeImportExportService.batches(),
    placeholderData: (previous) => previous,
  })
}

export function useExportFinance() {
  return useMutation({
    mutationFn: ({
      kind,
      format,
      filters,
    }: {
      kind: ImportKind
      format: 'csv' | 'xlsx'
      filters?: { category?: string; from?: string; to?: string }
    }) => financeImportExportService.download(kind, format, filters),
    onSuccess: ({ filename }) => toast.success(`Downloaded ${filename}.`),
    onError: (error) => toast.error(apiErrorMessage(error, 'Export failed.')),
  })
}

export function useImportPreview(onSuccess?: () => void) {
  return useMutation({
    mutationFn: ({ kind, file }: { kind: ImportKind; file: File }) =>
      financeImportExportService.preview(kind, file),
    onSuccess: () => {
      toast.success('File parsed.')
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to parse file.')),
  })
}

export function useConfirmImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchId: string) => financeImportExportService.confirm(batchId),
    onSuccess: (result) => {
      toast.success(`Imported ${result.created} of ${result.total} rows.`)
      queryClient.invalidateQueries({ queryKey: financeKeys.importBatches })
      queryClient.invalidateQueries({ queryKey: financeKeys.payments })
      queryClient.invalidateQueries({ queryKey: financeKeys.assessments })
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses })
      queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to import.')),
  })
}

export function useCancelImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batchId: string) => financeImportExportService.cancel(batchId),
    onSuccess: () => {
      toast.success('Import batch cancelled.')
      queryClient.invalidateQueries({ queryKey: financeKeys.importBatches })
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to cancel import batch.')),
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

// ==============================================
// Utility Expenses
// ==============================================

import {
  utilityExpensesService,
} from '@/features/finance/services/finance'
import type {
  CreateUtilityExpenseInput,
  UpdateUtilityExpenseInput,
} from '@/features/finance/types/finance'

export const utilityExpenseKeys = {
  all: ['utility-expenses'] as const,
  list: (params: ListQuery) => ['utility-expenses', 'list', params] as const,
  detail: (id: string) => ['utility-expenses', 'detail', id] as const,
  summary: (params?: { from?: string; to?: string }) =>
    ['utility-expenses', 'summary', params] as const,
}

export function useUtilityExpenses(params: ListQuery) {
  return useQuery({
    queryKey: utilityExpenseKeys.list(params),
    queryFn: () => utilityExpensesService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useUtilityExpenseSummary(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: utilityExpenseKeys.summary(params),
    queryFn: () => utilityExpensesService.summary(params),
  })
}

export function useCreateUtilityExpense(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUtilityExpenseInput) => utilityExpensesService.create(input),
    onSuccess: () => {
      toast.success('Utility expense recorded.')
      queryClient.invalidateQueries({ queryKey: utilityExpenseKeys.all })
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses })
      queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to record utility expense.')),
  })
}

export function useUpdateUtilityExpense(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUtilityExpenseInput }) =>
      utilityExpensesService.update(id, input),
    onSuccess: () => {
      toast.success('Utility expense updated.')
      queryClient.invalidateQueries({ queryKey: utilityExpenseKeys.all })
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses })
      queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update utility expense.')),
  })
}

export function useDeleteUtilityExpense(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => utilityExpensesService.remove(id),
    onSuccess: () => {
      toast.success('Utility expense deleted.')
      queryClient.invalidateQueries({ queryKey: utilityExpenseKeys.all })
      queryClient.invalidateQueries({ queryKey: financeKeys.expenses })
      queryClient.invalidateQueries({ queryKey: financeKeys.incomeStatement })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete utility expense.')),
  })
}

import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  Assessment,
  AssessmentListItem,
  BillingPeriod,
  CreateBillingPeriodInput,
  CreateAssessmentInput,
  CreateChargeTypeInput,
  CreateExpenseInput,
  CreatePaymentInput,
  ChargeType,
  DuesTracker,
  Expense,
  ExportFormat,
  FinanceTransaction,
  FinanceTransactionSummary,
  GenerateAssessmentsInput,
  GenerateAssessmentsResult,
  GenerateBillingPeriodsInput,
  ImportBatch,
  ImportKind,
  ImportPreviewResult,
  IncomeStatement,
  Payment,
  PaymentListItem,
  PaymentReceipt,
  ResidentOption,
  UpdateAssessmentInput,
  UpdateChargeTypeInput,
  UpdateExpenseInput,
  UpdatePaymentInput,
} from '@/features/finance/types/finance'

export interface ListResult<T> {
  items: T[]
  pagination?: Pagination
}

export const assessmentsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<AssessmentListItem[]>>('/assessments', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Assessment>>(`/assessments/${id}`)
    return data.data
  },

  async create(input: CreateAssessmentInput) {
    const { data } = await api.post<ApiEnvelope<Assessment>>('/assessments', input)
    return data.data
  },

  async update(id: string, input: UpdateAssessmentInput) {
    const { data } = await api.put<ApiEnvelope<Assessment>>(`/assessments/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/assessments/${id}`)
    return data.data
  },

  async generate(input: GenerateAssessmentsInput) {
    const { data } = await api.post<ApiEnvelope<GenerateAssessmentsResult>>(
      '/assessments/generate',
      input,
    )
    return data.data
  },

  async duesTracker(params: { months?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<DuesTracker>>(
      '/assessments/dues-tracker',
      { params },
    )
    return data.data
  },

  async issue(id: string) {
    const { data } = await api.patch<ApiEnvelope<Assessment>>(`/assessments/${id}/issue`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<Assessment>>(`/assessments/${id}/cancel`)
    return data.data
  },

  async waive(id: string) {
    const { data } = await api.patch<ApiEnvelope<Assessment>>(`/assessments/${id}/waive`)
    return data.data
  },
}

export const paymentsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<PaymentListItem[]>>('/payments', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Payment>>(`/payments/${id}`)
    return data.data
  },

  async receipt(id: string) {
    const { data } = await api.get<ApiEnvelope<PaymentReceipt>>(`/payments/${id}/receipt`)
    return data.data
  },

  async create(input: CreatePaymentInput) {
    const { data } = await api.post<ApiEnvelope<Payment>>('/payments', input)
    return data.data
  },

  async update(id: string, input: UpdatePaymentInput) {
    const { data } = await api.put<ApiEnvelope<Payment>>(`/payments/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/payments/${id}`)
    return data.data
  },

  async verify(id: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/verify`)
    return data.data
  },

  async reject(id: string, reason: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/reject`, {
      reason,
    })
    return data.data
  },

  async refund(id: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/refund`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/cancel`)
    return data.data
  },
}

export const chargeTypesService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<ChargeType[]>>('/charge-types', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<ChargeType>>(`/charge-types/${id}`)
    return data.data
  },

  async create(input: CreateChargeTypeInput) {
    const { data } = await api.post<ApiEnvelope<ChargeType>>('/charge-types', input)
    return data.data
  },

  async update(id: string, input: UpdateChargeTypeInput) {
    const { data } = await api.patch<ApiEnvelope<ChargeType>>(`/charge-types/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/charge-types/${id}`)
    return data.data
  },
}

export const billingPeriodsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<BillingPeriod[]>>('/billing-periods', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<BillingPeriod>>(`/billing-periods/${id}`)
    return data.data
  },

  async create(input: CreateBillingPeriodInput) {
    const { data } = await api.post<ApiEnvelope<BillingPeriod>>('/billing-periods', input)
    return data.data
  },

  async generate(input: GenerateBillingPeriodsInput) {
    const { data } = await api.post<ApiEnvelope<{ createdCount: number; created: BillingPeriod[] }>>(
      '/billing-periods/generate',
      input,
    )
    return data.data
  },

  async update(id: string, input: Partial<CreateBillingPeriodInput>) {
    const { data } = await api.patch<ApiEnvelope<BillingPeriod>>(`/billing-periods/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/billing-periods/${id}`)
    return data.data
  },
}

export const financeTransactionsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<
      ApiEnvelope<FinanceTransaction[]> & { summary?: FinanceTransactionSummary }
    >('/finance/transactions', { params })
    return {
      items: data.data,
      summary: data.summary,
      pagination: data.pagination,
    }
  },
}

export const expensesService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<Expense[]>>('/expenses', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Expense>>(`/expenses/${id}`)
    return data.data
  },

  async create(input: CreateExpenseInput) {
    const { data } = await api.post<ApiEnvelope<Expense>>('/expenses', input)
    return data.data
  },

  async update(id: string, input: UpdateExpenseInput) {
    const { data } = await api.patch<ApiEnvelope<Expense>>(`/expenses/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/expenses/${id}`)
    return data.data
  },
}

export const incomeStatementService = {
  async get(params: { from?: string; to?: string } = {}) {
    const { data } = await api.get<ApiEnvelope<IncomeStatement>>('/finance/income-statement', {
      params,
    })
    return data.data
  },
}

export const financeImportExportService = {
  async download(
    kind: ImportKind,
    format: ExportFormat,
    filters: { category?: string; from?: string; to?: string } = {},
  ) {
    const { data } = await api.get<Blob>(`/finance/import-export/export/${kind}`, {
      params: { format, ...filters },
      responseType: 'blob',
    })

    const filename = `finance-${kind}-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'csv'}`
    const url = URL.createObjectURL(data)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    return { filename, size: data.size }
  },

  async preview(kind: ImportKind, file: File) {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<ApiEnvelope<ImportPreviewResult>>(
      `/finance/import-export/import/preview?kind=${kind}`,
      form,
    )
    return data.data
  },

  async confirm(batchId: string) {
    const { data } = await api.post<ApiEnvelope<{ created: number; total: number; batchId: string }>>(
      `/finance/import-export/import/${batchId}/confirm`,
    )
    return data.data
  },

  async cancel(batchId: string) {
    const { data } = await api.post<ApiEnvelope<null>>(
      `/finance/import-export/import/${batchId}/cancel`,
    )
    return data.data
  },

  async batches() {
    const { data } = await api.get<ApiEnvelope<ImportBatch[]>>('/finance/import-export/import/batches')
    return data.data
  },
}

export interface HouseholdOption {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
  residentCount: number
}

export const financeHouseholdsService = {
  async options(params: { search?: string; limit?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<HouseholdOption[]>>('/finance/options/households', {
      params: { page: 1, ...params },
    })
    return { items: data.data, pagination: data.pagination }
  },
}

export const financeResidentsService = {
  async options(params: { search?: string; limit?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<ResidentOption[]>>('/finance/options/residents', {
      params: { page: 1, ...params },
    })
    return { items: data.data, pagination: data.pagination }
  },
}

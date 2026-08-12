import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  Assessment,
  AssessmentListItem,
  CreateAssessmentInput,
  CreatePaymentInput,
  GenerateAssessmentsInput,
  GenerateAssessmentsResult,
  Payment,
  PaymentListItem,
  ResidentOption,
  UpdateAssessmentInput,
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

  async issue(id: string) {
    const { data } = await api.patch<ApiEnvelope<Assessment>>(`/assessments/${id}/issue`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<Assessment>>(`/assessments/${id}/cancel`)
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

  async confirm(id: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/confirm`)
    return data.data
  },

  async reject(id: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/reject`)
    return data.data
  },

  async refund(id: string) {
    const { data } = await api.patch<ApiEnvelope<Payment>>(`/payments/${id}/refund`)
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

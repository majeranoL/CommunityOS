import api from '@/lib/api'
import type { ApiEnvelope, Pagination } from '@/types/api'
import type { AdminPlan, AdminPlanInput } from '@/features/admin/types/plan'

export interface PlanListParams {
  page?: number
  limit?: number
  search?: string
  includeInactive?: boolean
}

export const plansService = {
  async list(params: PlanListParams = {}) {
    const { data } = await api.get<ApiEnvelope<AdminPlan[]> & { pagination: Pagination }>(
      '/subscription-plans',
      { params },
    )
    return { items: data.data, pagination: data.pagination }
  },

  async create(input: AdminPlanInput) {
    const { data } = await api.post<ApiEnvelope<AdminPlan>>('/subscription-plans', input)
    return data.data
  },

  async update(id: string, input: Partial<AdminPlanInput>) {
    const { data } = await api.put<ApiEnvelope<AdminPlan>>(`/subscription-plans/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/subscription-plans/${id}`)
    return data.data
  },
}

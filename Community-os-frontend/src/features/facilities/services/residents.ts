import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { ResidentOption } from '@/features/facilities/types/resident'

export const residentsService = {
  async options(params: { search?: string; limit?: number } = {}) {
    const { data } = await api.get<ApiEnvelope<ResidentOption[]>>('/residents', {
      params: { page: 1, ...params },
    })
    return { items: data.data, pagination: data.pagination }
  },
}

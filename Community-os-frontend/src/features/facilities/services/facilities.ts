import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { Facility, FacilityListItem } from '@/features/facilities/types/facility'

export interface FacilityListParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  status?: string
}

export interface FacilityInput {
  name: string
  type: string
  description?: string
  location?: string
  capacity?: number
  imageUrl?: string
  hourlyRate?: number
  status?: string
}

export const facilitiesService = {
  async list(params: FacilityListParams = {}) {
    const { data } = await api.get<ApiEnvelope<FacilityListItem[]>>('/facilities', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Facility>>(`/facilities/${id}`)
    return data.data
  },

  async create(input: FacilityInput) {
    const { data } = await api.post<ApiEnvelope<Facility>>('/facilities', input)
    return data.data
  },

  async update(id: string, input: Partial<FacilityInput>) {
    const { data } = await api.put<ApiEnvelope<Facility>>(`/facilities/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/facilities/${id}`)
    return data.data
  },
}

import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type { CreateVisitorInput, VisitorListItem } from '@/features/visitors/types/visitor'

export interface VisitorListResult {
  items: VisitorListItem[]
  pagination?: Pagination
}

export const visitorsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<VisitorListItem[]>>('/visitors', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<VisitorListItem>>(`/visitors/${id}`)
    return data.data
  },

  async create(input: CreateVisitorInput) {
    const { data } = await api.post<ApiEnvelope<VisitorListItem>>('/visitors', input)
    return data.data
  },

  async checkIn(id: string) {
    const { data } = await api.patch<ApiEnvelope<VisitorListItem>>(`/visitors/${id}/check-in`)
    return data.data
  },

  async checkOut(id: string) {
    const { data } = await api.patch<ApiEnvelope<VisitorListItem>>(`/visitors/${id}/check-out`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<VisitorListItem>>(`/visitors/${id}/cancel`)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/visitors/${id}`)
    return data.data
  },
}

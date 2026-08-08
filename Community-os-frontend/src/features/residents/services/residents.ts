import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateResidentInput,
  ResidentDetail,
  ResidentListItem,
  UpdateResidentInput,
} from '@/features/residents/types/resident'

export interface ResidentListResult {
  items: ResidentListItem[]
  pagination?: Pagination
}

export const residentsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<ResidentListItem[]>>('/residents', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<ResidentDetail>>(`/residents/${id}`)
    return data.data
  },

  async create(input: CreateResidentInput) {
    const { data } = await api.post<ApiEnvelope<ResidentDetail>>('/residents', input)
    return data.data
  },

  async update(id: string, input: UpdateResidentInput) {
    const { data } = await api.put<ApiEnvelope<ResidentDetail>>(`/residents/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/residents/${id}`)
    return data.data
  },
}

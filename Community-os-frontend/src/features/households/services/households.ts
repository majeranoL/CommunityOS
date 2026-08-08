import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateHouseholdInput,
  HouseholdDetail,
  HouseholdListItem,
  UpdateHouseholdInput,
} from '@/features/households/types/household'

export interface HouseholdListResult {
  items: HouseholdListItem[]
  pagination?: Pagination
}

export const householdsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<HouseholdListItem[]>>('/households', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<HouseholdDetail>>(`/households/${id}`)
    return data.data
  },

  async create(input: CreateHouseholdInput) {
    const { data } = await api.post<ApiEnvelope<HouseholdListItem>>('/households', input)
    return data.data
  },

  async update(id: string, input: UpdateHouseholdInput) {
    const { data } = await api.put<ApiEnvelope<HouseholdListItem>>(`/households/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/households/${id}`)
    return data.data
  },
}

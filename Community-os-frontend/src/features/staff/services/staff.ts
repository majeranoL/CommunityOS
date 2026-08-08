import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateStaffInput,
  StaffDetail,
  StaffListItem,
  UpdateStaffInput,
} from '@/features/staff/types/staff'

export interface StaffListResult {
  items: StaffListItem[]
  pagination?: Pagination
}

export const staffService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<StaffListItem[]>>('/staff', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<StaffDetail>>(`/staff/${id}`)
    return data.data
  },

  async create(input: CreateStaffInput) {
    const { data } = await api.post<ApiEnvelope<StaffListItem>>('/staff', input)
    return data.data
  },

  async update(id: string, input: UpdateStaffInput) {
    const { data } = await api.put<ApiEnvelope<StaffListItem>>(`/staff/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/staff/${id}`)
    return data.data
  },
}

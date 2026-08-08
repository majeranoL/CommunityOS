import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateMaintenanceInput,
  MaintenanceListItem,
  UpdateMaintenanceInput,
} from '@/features/maintenance/types/maintenance'

export interface MaintenanceListResult {
  items: MaintenanceListItem[]
  pagination?: Pagination
}

export const maintenanceService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<MaintenanceListItem[]>>('/maintenance', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<MaintenanceListItem>>(`/maintenance/${id}`)
    return data.data
  },

  async create(input: CreateMaintenanceInput) {
    const { data } = await api.post<ApiEnvelope<MaintenanceListItem>>('/maintenance', input)
    return data.data
  },

  async update(id: string, input: UpdateMaintenanceInput) {
    const { data } = await api.put<ApiEnvelope<MaintenanceListItem>>(`/maintenance/${id}`, input)
    return data.data
  },

  async assign(id: string, staffId: string) {
    const { data } = await api.patch<ApiEnvelope<MaintenanceListItem>>(
      `/maintenance/${id}/assign`,
      { staffId },
    )
    return data.data
  },

  async start(id: string) {
    const { data } = await api.patch<ApiEnvelope<MaintenanceListItem>>(`/maintenance/${id}/start`)
    return data.data
  },

  async resolve(id: string) {
    const { data } = await api.patch<ApiEnvelope<MaintenanceListItem>>(`/maintenance/${id}/resolve`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<MaintenanceListItem>>(`/maintenance/${id}/cancel`)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/maintenance/${id}`)
    return data.data
  },
}

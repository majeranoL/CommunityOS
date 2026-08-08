import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleListItem,
} from '@/features/vehicles/types/vehicle'

export interface VehicleListResult {
  items: VehicleListItem[]
  pagination?: Pagination
}

export const vehiclesService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<VehicleListItem[]>>('/vehicles', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<VehicleListItem>>(`/vehicles/${id}`)
    return data.data
  },

  async create(input: CreateVehicleInput) {
    const { data } = await api.post<ApiEnvelope<VehicleListItem>>('/vehicles', input)
    return data.data
  },

  async update(id: string, input: UpdateVehicleInput) {
    const { data } = await api.put<ApiEnvelope<VehicleListItem>>(`/vehicles/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/vehicles/${id}`)
    return data.data
  },
}

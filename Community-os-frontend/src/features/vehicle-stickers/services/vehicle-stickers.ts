import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateStickerInput,
  RenewStickerInput,
  UpdateStickerInput,
  VehicleStickerListItem,
  VerifyStickerInput,
} from '@/features/vehicle-stickers/types/vehicle-sticker'

export interface StickerListResult {
  items: VehicleStickerListItem[]
  pagination?: Pagination
}

export const vehicleStickersService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<VehicleStickerListItem[]>>('/vehicle-stickers', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<VehicleStickerListItem>>(`/vehicle-stickers/${id}`)
    return data.data
  },

  async getByVehicle(vehicleId: string) {
    const { data } = await api.get<ApiEnvelope<VehicleStickerListItem[]>>(
      `/vehicle-stickers/vehicle/${vehicleId}`,
    )
    return data.data
  },

  async create(input: CreateStickerInput) {
    const { data } = await api.post<ApiEnvelope<VehicleStickerListItem>>('/vehicle-stickers', input)
    return data.data
  },

  async update(id: string, input: UpdateStickerInput) {
    const { data } = await api.put<ApiEnvelope<VehicleStickerListItem>>(
      `/vehicle-stickers/${id}`,
      input,
    )
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/vehicle-stickers/${id}`)
    return data.data
  },

  async verify(id: string, input: VerifyStickerInput) {
    const { data } = await api.post<ApiEnvelope<VehicleStickerListItem>>(
      `/vehicle-stickers/${id}/verify`,
      input,
    )
    return data.data
  },

  async renew(id: string, input: RenewStickerInput) {
    const { data } = await api.post<ApiEnvelope<VehicleStickerListItem>>(
      `/vehicle-stickers/${id}/renew`,
      input,
    )
    return data.data
  },
}

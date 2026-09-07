import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateStickerInput,
  RenewStickerInput,
  RequestStickerInput,
  StickerOptions,
  StickerRequestListItem,
  StickerSettingsInput,
  UpdateStickerInput,
  VerifyStickerInput,
} from '@/features/vehicle-stickers/types/vehicle-sticker'

export interface StickerListResult {
  items: StickerRequestListItem[]
  pagination?: Pagination
}

export const vehicleStickersService = {
  async options() {
    const { data } = await api.get<ApiEnvelope<StickerOptions>>('/vehicle-stickers/options')
    return data.data
  },

  async request(input: RequestStickerInput) {
    const { data } = await api.post<ApiEnvelope<StickerRequestListItem>>(
      '/vehicle-stickers/request',
      input,
    )
    return data.data
  },

  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<StickerRequestListItem[]>>('/vehicle-stickers', {
      params,
    })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<StickerRequestListItem>>(`/vehicle-stickers/${id}`)
    return data.data
  },

  async getByVehicle(vehicleId: string) {
    const { data } = await api.get<ApiEnvelope<StickerRequestListItem[]>>(
      `/vehicle-stickers/vehicle/${vehicleId}`,
    )
    return data.data
  },

  async create(input: CreateStickerInput) {
    const { data } = await api.post<ApiEnvelope<{ stickers: StickerRequestListItem[] }>>(
      '/vehicle-stickers',
      input,
    )
    return data.data
  },

  async update(id: string, input: UpdateStickerInput) {
    const { data } = await api.put<ApiEnvelope<StickerRequestListItem>>(
      `/vehicle-stickers/${id}`,
      input,
    )
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/vehicle-stickers/${id}`)
    return data.data
  },

  async cancelRequest(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/vehicle-stickers/requests/${id}`)
    return data.data
  },

  async verify(id: string, input: VerifyStickerInput) {
    const { data } = await api.post<ApiEnvelope<StickerRequestListItem>>(
      `/vehicle-stickers/${id}/verify`,
      input,
    )
    return data.data
  },

  async renew(id: string, input: RenewStickerInput) {
    const { data } = await api.post<ApiEnvelope<StickerRequestListItem>>(
      `/vehicle-stickers/${id}/renew`,
      input,
    )
    return data.data
  },

  async updateSettings(input: StickerSettingsInput) {
    const { data } = await api.put<ApiEnvelope<StickerOptions['cycle']>>(
      '/vehicle-stickers/settings',
      input,
    )
    return data.data
  },
}
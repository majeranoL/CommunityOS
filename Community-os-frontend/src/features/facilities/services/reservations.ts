import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { Reservation, ReservationListItem } from '@/features/facilities/types/reservation'

export interface ReservationListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  facilityId?: string
  residentId?: string
}

export interface ReservationInput {
  facilityId: string
  residentId: string
  purpose?: string
  startAt: string
  endAt: string
  remarks?: string
}

export const reservationsService = {
  async list(params: ReservationListParams = {}) {
    const { data } = await api.get<ApiEnvelope<ReservationListItem[]>>('/reservations', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Reservation>>(`/reservations/${id}`)
    return data.data
  },

  async create(input: ReservationInput) {
    const { data } = await api.post<ApiEnvelope<Reservation>>('/reservations', input)
    return data.data
  },

  async update(id: string, input: Partial<ReservationInput>) {
    const { data } = await api.put<ApiEnvelope<Reservation>>(`/reservations/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/reservations/${id}`)
    return data.data
  },

  async approve(id: string) {
    const { data } = await api.patch<ApiEnvelope<Reservation>>(`/reservations/${id}/approve`)
    return data.data
  },

  async reject(id: string) {
    const { data } = await api.patch<ApiEnvelope<Reservation>>(`/reservations/${id}/reject`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<Reservation>>(`/reservations/${id}/cancel`)
    return data.data
  },

  async complete(id: string) {
    const { data } = await api.patch<ApiEnvelope<Reservation>>(`/reservations/${id}/complete`)
    return data.data
  },
}

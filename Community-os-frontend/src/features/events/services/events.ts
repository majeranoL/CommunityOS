import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type { CommunityEvent, CreateEventInput, EventAttendee, UpdateEventInput } from '@/features/events/types/event'

export interface EventListResult {
  items: CommunityEvent[]
  pagination?: Pagination
}

export const eventsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<CommunityEvent[]>>('/events', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<CommunityEvent>>(`/events/${id}`)
    return data.data
  },

  async create(input: CreateEventInput) {
    const { data } = await api.post<ApiEnvelope<CommunityEvent>>('/events', input)
    return data.data
  },

  async update(id: string, input: UpdateEventInput) {
    const { data } = await api.put<ApiEnvelope<CommunityEvent>>(`/events/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/events/${id}`)
    return data.data
  },

  async publish(id: string) {
    const { data } = await api.patch<ApiEnvelope<CommunityEvent>>(`/events/${id}/publish`)
    return data.data
  },

  async cancel(id: string) {
    const { data } = await api.patch<ApiEnvelope<CommunityEvent>>(`/events/${id}/cancel`)
    return data.data
  },

  async complete(id: string) {
    const { data } = await api.patch<ApiEnvelope<CommunityEvent>>(`/events/${id}/complete`)
    return data.data
  },

  async rsvp(id: string) {
    const { data } = await api.post<ApiEnvelope<{ attendeeCount: number }>>(`/events/${id}/rsvp`)
    return data.data
  },

  async cancelRsvp(id: string) {
    const { data } = await api.delete<ApiEnvelope<{ attendeeCount: number }>>(`/events/${id}/rsvp`)
    return data.data
  },

  async getAttendees(id: string) {
    const { data } = await api.get<ApiEnvelope<EventAttendee[]>>(`/events/${id}/attendees`)
    return data.data
  },
}

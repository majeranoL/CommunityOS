import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  Announcement,
  AnnouncementListItem,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/features/announcements/types/announcement'

export interface AnnouncementListResult {
  items: AnnouncementListItem[]
  pagination?: Pagination
}

export const announcementsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<AnnouncementListItem[]>>('/announcements', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Announcement>>(`/announcements/${id}`)
    return data.data
  },

  async create(input: CreateAnnouncementInput) {
    const { data } = await api.post<ApiEnvelope<Announcement>>('/announcements', input)
    return data.data
  },

  async update(id: string, input: UpdateAnnouncementInput) {
    const { data } = await api.put<ApiEnvelope<Announcement>>(`/announcements/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/announcements/${id}`)
    return data.data
  },

  async publish(id: string) {
    const { data } = await api.patch<ApiEnvelope<Announcement>>(`/announcements/${id}/publish`)
    return data.data
  },
}

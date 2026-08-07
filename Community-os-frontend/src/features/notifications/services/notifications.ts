import api from '@/lib/api'
import type { ApiEnvelope, Pagination } from '@/types/api'
import type { AppNotification } from '@/features/notifications/types/notification'

export interface NotificationListResult {
  items: AppNotification[]
  unreadCount: number
  pagination?: Pagination
}

export const notificationsService = {
  async list(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
    const { data } = await api.get<ApiEnvelope<AppNotification[]> & { unreadCount: number }>(
      '/notifications',
      { params },
    )
    return { items: data.data, unreadCount: data.unreadCount, pagination: data.pagination }
  },

  async unreadCount() {
    const { data } = await api.get<ApiEnvelope<{ count: number }>>('/notifications/unread-count')
    return data.data.count
  },

  async markRead(id: string) {
    const { data } = await api.patch<ApiEnvelope<AppNotification>>(`/notifications/${id}/read`)
    return data.data
  },

  async markAllRead() {
    const { data } = await api.patch<ApiEnvelope<{ updated: number }>>('/notifications/read-all')
    return data.data
  },
}

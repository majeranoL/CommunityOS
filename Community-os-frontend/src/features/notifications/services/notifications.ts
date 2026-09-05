import api from '@/lib/api'
import type { ApiEnvelope, Pagination } from '@/types/api'
import type {
  AppNotification,
  NotificationPreference,
  NotificationSettings,
} from '@/features/notifications/types/notification'

export interface NotificationListResult {
  items: AppNotification[]
  unreadCount: number
  pagination?: Pagination
}

export interface PushSubscriptionPayload {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
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

  async getPreferences() {
    const { data } = await api.get<ApiEnvelope<NotificationSettings>>('/notifications/preferences')
    return data.data
  },

  async updatePreferences(preferences: NotificationPreference[]) {
    const { data } = await api.put<ApiEnvelope<NotificationSettings>>('/notifications/preferences', {
      preferences,
    })
    return data.data
  },

  async pushSubscribe(payload: PushSubscriptionPayload) {
    const { data } = await api.post<ApiEnvelope<{ subscribed: boolean }>>('/notifications/push-subscribe', {
      ...payload,
      userAgent: navigator.userAgent,
    })
    return data.data.subscribed
  },

  async pushUnsubscribe(endpoint?: string) {
    const url = endpoint
      ? `/notifications/push-subscribe/${encodeURIComponent(endpoint)}`
      : '/notifications/push-subscribe'
    const { data } = await api.delete<ApiEnvelope<{ subscribed: boolean }>>(url)
    return data.data.subscribed
  },
}

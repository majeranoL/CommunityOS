import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type { CreateMessageInput, MessageListItem } from '@/features/messages/types/message'

export interface MessageListResult {
  items: MessageListItem[]
  pagination?: Pagination
}

export const messagesService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<MessageListItem[]>>('/messages', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<MessageListItem>>(`/messages/${id}`)
    return data.data
  },

  async create(input: CreateMessageInput) {
    const { data } = await api.post<ApiEnvelope<MessageListItem>>('/messages', input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/messages/${id}`)
    return data.data
  },

  async markAsRead(id: string) {
    const { data } = await api.patch<ApiEnvelope<MessageListItem>>(`/messages/${id}/read`)
    return data.data
  },
}

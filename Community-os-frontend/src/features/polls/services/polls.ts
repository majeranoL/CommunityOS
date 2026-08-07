import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreatePollInput,
  PollDetail,
  PollListItem,
  PollOption,
  UpdatePollInput,
} from '@/features/polls/types/poll'

export interface PollListResult {
  items: PollListItem[]
  pagination?: Pagination
}

export const pollsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<PollListItem[]>>('/polls', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<PollDetail>>(`/polls/${id}`)
    return data.data
  },

  async create(input: CreatePollInput) {
    const { data } = await api.post<ApiEnvelope<PollDetail>>('/polls', input)
    return data.data
  },

  async update(id: string, input: UpdatePollInput) {
    const { data } = await api.put<ApiEnvelope<PollDetail>>(`/polls/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/polls/${id}`)
    return data.data
  },

  async publish(id: string) {
    const { data } = await api.patch<ApiEnvelope<PollDetail>>(`/polls/${id}/publish`)
    return data.data
  },

  async close(id: string) {
    const { data } = await api.patch<ApiEnvelope<PollDetail>>(`/polls/${id}/close`)
    return data.data
  },

  async vote(id: string, optionIds: string[]) {
    const { data } = await api.post<ApiEnvelope<PollDetail>>(`/polls/${id}/vote`, { optionIds })
    return data.data
  },

  async addOption(id: string, text: string) {
    const { data } = await api.post<ApiEnvelope<PollOption>>(`/polls/${id}/options`, { text })
    return data.data
  },
}

import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  CreateRenterInput,
  CreateUserInput,
  RoleSummary,
  UpdateUserInput,
  UserListItem,
} from '@/features/users/types/user'

export interface UserListResult {
  items: UserListItem[]
  pagination?: Pagination
}

export const usersService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<UserListItem[]>>('/users', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<UserListItem>>(`/users/${id}`)
    return data.data
  },

  async create(input: CreateUserInput) {
    const { data } = await api.post<ApiEnvelope<UserListItem>>('/users', input)
    return data.data
  },

  async createRenter(input: CreateRenterInput) {
    const { data } = await api.post<ApiEnvelope<unknown>>('/users/renters', input)
    return data.data
  },

  async update(id: string, input: UpdateUserInput) {
    const { data } = await api.put<ApiEnvelope<UserListItem>>(`/users/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/users/${id}`)
    return data.data
  },

  async roles() {
    const { data } = await api.get<ApiEnvelope<RoleSummary[]>>('/roles', { params: { limit: 100 } })
    return data.data
  },
}

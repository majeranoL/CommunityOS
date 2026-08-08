import api from '@/lib/api'
import type { ApiEnvelope, ListQuery, Pagination } from '@/types/api'
import type {
  AssignPermissionsInput,
  CreateRoleInput,
  PermissionItem,
  RoleDetail,
  RoleListItem,
  UpdateRoleInput,
} from '@/features/roles/types/role'

export interface RoleListResult {
  items: RoleListItem[]
  pagination?: Pagination
}

export interface PermissionListResult {
  items: PermissionItem[]
  pagination?: Pagination
}

export const rolesService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<RoleListItem[]>>('/roles', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<RoleDetail>>(`/roles/${id}`)
    return data.data
  },

  async create(input: CreateRoleInput) {
    const { data } = await api.post<ApiEnvelope<RoleListItem>>('/roles', input)
    return data.data
  },

  async update(id: string, input: UpdateRoleInput) {
    const { data } = await api.put<ApiEnvelope<RoleListItem>>(`/roles/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/roles/${id}`)
    return data.data
  },

  async assignPermissions(id: string, input: AssignPermissionsInput) {
    const { data } = await api.post<ApiEnvelope<RoleDetail>>(`/roles/${id}/permissions`, input)
    return data.data
  },
}

export const permissionsService = {
  async list(params: ListQuery = {}) {
    const { data } = await api.get<ApiEnvelope<PermissionItem[]>>('/permissions', { params })
    return { items: data.data, pagination: data.pagination }
  },

  async all(): Promise<PermissionItem[]> {
    const items: PermissionItem[] = []
    let page = 1
    let hasNextPage = true
    while (hasNextPage) {
      const { data } = await api.get<ApiEnvelope<PermissionItem[]>>('/permissions', {
        params: { page, limit: 100, sortBy: 'code', order: 'asc' },
      })
      items.push(...data.data)
      hasNextPage = Boolean(data.pagination?.hasNextPage)
      page += 1
    }
    return items
  },
}

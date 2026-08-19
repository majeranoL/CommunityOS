import api from '@/lib/api'
import type { ApiEnvelope, Pagination } from '@/types/api'
import type {
  Feature,
  FeatureAssignInput,
  FeatureAssignment,
  FeatureAuditLog,
  FeatureInput,
  FeatureUpdateInput,
} from '@/features/admin/types/feature'

export interface FeatureListParams {
  page?: number
  limit?: number
  search?: string
  type?: string
}

export const featuresService = {
  async list(params: FeatureListParams = {}) {
    const { data } = await api.get<ApiEnvelope<Feature[]> & { pagination: Pagination }>(
      '/admin/features',
      { params },
    )
    return { items: data.data, pagination: data.pagination }
  },

  async get(id: string) {
    const { data } = await api.get<ApiEnvelope<Feature>>(`/admin/features/${id}`)
    return data.data
  },

  async create(input: FeatureInput) {
    const { data } = await api.post<ApiEnvelope<Feature>>('/admin/features', input)
    return data.data
  },

  async update(id: string, input: Partial<FeatureInput>) {
    const { data } = await api.patch<ApiEnvelope<Feature>>(`/admin/features/${id}`, input)
    return data.data
  },

  async remove(id: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(`/admin/features/${id}`)
    return data.data
  },

  async listCommunities(featureId: string) {
    const { data } = await api.get<ApiEnvelope<FeatureAssignment[]>>(
      `/admin/features/${featureId}/communities`,
    )
    return data.data
  },

  async assign(featureId: string, input: FeatureAssignInput) {
    const { data } = await api.post<ApiEnvelope<FeatureAssignment>>(
      `/admin/features/${featureId}/assign`,
      input,
    )
    return data.data
  },

  async updateAssignment(featureId: string, communityId: string, input: FeatureUpdateInput) {
    const { data } = await api.patch<ApiEnvelope<FeatureAssignment>>(
      `/admin/features/${featureId}/assignments/${communityId}`,
      input,
    )
    return data.data
  },

  async revoke(featureId: string, communityId: string) {
    const { data } = await api.delete<ApiEnvelope<null>>(
      `/admin/features/${featureId}/assignments/${communityId}`,
    )
    return data.data
  },

  async listByCommunity(communityId: string) {
    const { data } = await api.get<ApiEnvelope<FeatureAssignment[]>>(
      `/admin/features/by-community/${communityId}`,
    )
    return data.data
  },

  async listAuditLogs(
    featureId: string,
    params: { communityId?: string; page?: number; limit?: number } = {},
  ) {
    const { data } = await api.get<
      ApiEnvelope<FeatureAuditLog[]> & { pagination: Pagination }
    >(`/admin/features/${featureId}/audit`, { params })
    return { items: data.data, pagination: data.pagination }
  },

  async listAuditLogsByCommunity(
    communityId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const { data } = await api.get<
      ApiEnvelope<FeatureAuditLog[]> & { pagination: Pagination }
    >(`/admin/features/by-community/${communityId}/audit`, { params })
    return { items: data.data, pagination: data.pagination }
  },
}

import api from '@/lib/api'
import type { ApiEnvelope, Pagination } from '@/types/api'
import type {
  Feature,
  FeatureAssignInput,
  FeatureAssignment,
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
}

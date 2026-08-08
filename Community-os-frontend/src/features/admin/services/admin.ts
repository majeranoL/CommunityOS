import api from '@/lib/api'
import type {
  AdminAnalytics,
  AdminCommunity,
  AdminCommunityDetail,
  AdminOverview,
  ApiEnvelope,
  HoaSignupInput,
  HoaSignupResult,
  Pagination,
  Subscription,
} from '@/types/api'

export async function fetchAdminOverview() {
  const { data } = await api.get<ApiEnvelope<AdminOverview>>('/admin/overview')
  return data.data
}

export async function fetchAdminAnalytics() {
  const { data } = await api.get<ApiEnvelope<AdminAnalytics>>('/admin/analytics')
  return data.data
}

export async function fetchAdminCommunities(query: { page?: number; limit?: number; search?: string; status?: string }) {
  const { data } = await api.get<ApiEnvelope<AdminCommunity[]> & { pagination: Pagination }>('/admin/communities', {
    params: query,
  })
  return { items: data.data, pagination: data.pagination }
}

export async function fetchAdminCommunity(id: string) {
  const { data } = await api.get<ApiEnvelope<AdminCommunityDetail>>(`/admin/communities/${id}`)
  return data.data
}

export async function provisionCommunity(input: HoaSignupInput) {
  const { data } = await api.post<ApiEnvelope<HoaSignupResult>>('/admin/communities', input)
  return data.data
}

export async function updateCommunityStatus(id: string, status: string) {
  const { data } = await api.patch<ApiEnvelope<AdminCommunity>>(`/admin/communities/${id}`, { status })
  return data.data
}

export async function deleteCommunity(id: string) {
  const { data } = await api.delete<ApiEnvelope<{ success: true }>>(`/admin/communities/${id}`)
  return data.data
}

export async function fetchTenantSubscription(communityId: string) {
  const { data } = await api.get<ApiEnvelope<Subscription>>(`/admin/communities/${communityId}/subscription`)
  return data.data
}

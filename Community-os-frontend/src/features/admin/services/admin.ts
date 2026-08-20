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

// ==========================================
// Platform Monitoring
// ==========================================

export interface SystemHealth {
  status: 'healthy' | 'degraded'
  timestamp: string
  uptime: { seconds: number; human: string }
  database: { status: 'up' | 'down'; latencyMs: number }
  memory: {
    rssBytes: number
    heapUsedBytes: number
    heapTotalBytes: number
    externalBytes: number
    rssMb: number
    heapUsedMb: number
    heapTotalMb: number
  }
  process: { pid: number; nodeVersion: string; platform: string; arch: string }
  responseMs: number
}

export interface PlatformStats {
  communities: { total: number; active: number }
  users: { total: number; activeLast30Days: number }
  residents: { total: number }
  households: { total: number }
  complaints: { total: number; open: number }
  visitors: { total: number; currentlyCheckedIn: number }
  notifications: { total: number; unread: number }
  auditLogs: { total: number; last7Days: number }
}

export async function fetchSystemHealth() {
  const { data } = await api.get<ApiEnvelope<SystemHealth>>('/admin/monitoring/health')
  return data.data
}

export async function fetchPlatformStats() {
  const { data } = await api.get<ApiEnvelope<PlatformStats>>('/admin/monitoring/stats')
  return data.data
}

// ==========================================
// Billing Exemptions
// ==========================================

export interface BillingExemption {
  id: string
  communityId: string
  reason: string
  startDate: string
  endDate: string | null
  grantedById: string
  grantedBy: { id: string; firstName: string; lastName: string } | null
  createdAt: string
}

export async function fetchExemptions(communityId: string) {
  const { data } = await api.get<ApiEnvelope<BillingExemption[]>>(`/admin/communities/${communityId}/exemptions`)
  return data.data
}

export async function grantExemption(
  communityId: string,
  input: { reason: string; startDate: string; endDate?: string },
) {
  const { data } = await api.post<ApiEnvelope<BillingExemption>>(
    `/admin/communities/${communityId}/exemptions`,
    input,
  )
  return data.data
}

export async function revokeExemption(communityId: string, exemptionId: string) {
  const { data } = await api.delete<ApiEnvelope<{ success: true }>>(
    `/admin/communities/${communityId}/exemptions/${exemptionId}`,
  )
  return data.data
}

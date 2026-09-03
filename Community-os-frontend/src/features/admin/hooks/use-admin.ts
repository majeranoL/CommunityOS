import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  deleteCommunity,
  fetchAdminAnalytics,
  fetchAdminCommunities,
  fetchAdminCommunity,
  fetchAdminOverview,
  fetchExemptions,
  fetchPlatformStats,
  fetchSystemHealth,
  fetchTenantSubscription,
  grantExemption,
  provisionCommunity,
  revokeExemption,
  updateCommunityStatus,
} from '@/features/admin/services/admin'
import type { AdminProvisionInput } from '@/types/api'

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchAdminOverview,
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: fetchAdminAnalytics,
  })
}

export function useAdminCommunities(query: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'communities', query],
    queryFn: () => fetchAdminCommunities(query),
  })
}

export function useAdminCommunity(id: string) {
  return useQuery({
    queryKey: ['admin', 'communities', id],
    queryFn: () => fetchAdminCommunity(id),
    enabled: Boolean(id),
  })
}

export function useTenantSubscription(communityId: string) {
  return useQuery({
    queryKey: ['admin', 'communities', communityId, 'subscription'],
    queryFn: () => fetchTenantSubscription(communityId),
    enabled: Boolean(communityId),
  })
}

export function useProvisionCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: AdminProvisionInput) => provisionCommunity(input),
    onSuccess: () => {
      toast.success('Community provisioned successfully.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'communities'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to provision community.'))
    },
  })
}

export function useUpdateCommunityStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateCommunityStatus(id, status),
    onSuccess: () => {
      toast.success('Community status updated.')
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to update community status.'))
    },
  })
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCommunity(id),
    onSuccess: () => {
      toast.success('Community deleted.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'communities'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to delete community.'))
    },
  })
}

// ==========================================
// Platform Monitoring
// ==========================================

export function useSystemHealth() {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 30_000,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin', 'monitoring', 'stats'],
    queryFn: fetchPlatformStats,
    refetchInterval: 60_000,
  })
}

// ==========================================
// Billing Exemptions
// ==========================================

export function useExemptions(communityId: string) {
  return useQuery({
    queryKey: ['admin', 'communities', communityId, 'exemptions'],
    queryFn: () => fetchExemptions(communityId),
    enabled: Boolean(communityId),
  })
}

export function useGrantExemption(communityId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { reason: string; startDate: string; endDate?: string }) =>
      grantExemption(communityId, input),
    onSuccess: () => {
      toast.success('Billing exemption granted.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'communities', communityId, 'exemptions'] })
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to grant exemption.'))
    },
  })
}

export function useRevokeExemption(communityId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (exemptionId: string) => revokeExemption(communityId, exemptionId),
    onSuccess: () => {
      toast.success('Billing exemption revoked.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'communities', communityId, 'exemptions'] })
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Failed to revoke exemption.'))
    },
  })
}

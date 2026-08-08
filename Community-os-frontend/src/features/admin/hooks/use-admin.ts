import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  deleteCommunity,
  fetchAdminCommunities,
  fetchAdminCommunity,
  fetchAdminOverview,
  fetchTenantSubscription,
  provisionCommunity,
  updateCommunityStatus,
} from '@/features/admin/services/admin'
import type { HoaSignupInput } from '@/types/api'

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchAdminOverview,
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
    mutationFn: (input: HoaSignupInput) => provisionCommunity(input),
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

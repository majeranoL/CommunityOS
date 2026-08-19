import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  featuresService,
  type FeatureListParams,
} from '@/features/admin/services/features'
import type {
  FeatureAssignInput,
  FeatureInput,
  FeatureUpdateInput,
} from '@/features/admin/types/feature'

export const featureKeys = {
  all: ['admin', 'features'] as const,
  list: (params: unknown) => ['admin', 'features', 'list', params] as const,
  detail: (id: string) => ['admin', 'features', 'detail', id] as const,
  communities: (featureId: string) => ['admin', 'features', 'communities', featureId] as const,
  audit: (featureId: string, params?: unknown) =>
    ['admin', 'features', 'audit', featureId, params] as const,
  communityAudit: (communityId: string, params?: unknown) =>
    ['admin', 'features', 'community-audit', communityId, params] as const,
}

export function useFeatures(params: FeatureListParams = {}) {
  return useQuery({
    queryKey: featureKeys.list(params),
    queryFn: () => featuresService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useFeature(id: string | null) {
  return useQuery({
    queryKey: featureKeys.detail(id ?? ''),
    queryFn: () => featuresService.get(id as string),
    enabled: Boolean(id),
  })
}

export function useFeatureCommunities(featureId: string | null) {
  return useQuery({
    queryKey: featureKeys.communities(featureId ?? ''),
    queryFn: () => featuresService.listCommunities(featureId as string),
    enabled: Boolean(featureId),
  })
}

export function useFeatureAuditLogs(
  featureId: string | null,
  params: { communityId?: string; page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: featureKeys.audit(featureId ?? '', params),
    queryFn: () => featuresService.listAuditLogs(featureId as string, params),
    enabled: Boolean(featureId),
  })
}

export function useCommunityFeatureAuditLogs(
  communityId: string | null,
  params: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: featureKeys.communityAudit(communityId ?? '', params),
    queryFn: () => featuresService.listAuditLogsByCommunity(communityId as string, params),
    enabled: Boolean(communityId),
  })
}

export function useCreateFeature(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FeatureInput) => featuresService.create(input),
    onSuccess: () => {
      toast.success('Feature created.')
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to create feature.')),
  })
}

export function useUpdateFeature(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FeatureInput> }) =>
      featuresService.update(id, input),
    onSuccess: (_data, variables) => {
      toast.success('Feature updated.')
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
      queryClient.invalidateQueries({ queryKey: featureKeys.detail(variables.id) })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update feature.')),
  })
}

export function useDeleteFeature(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => featuresService.remove(id),
    onSuccess: () => {
      toast.success('Feature deleted.')
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to delete feature.')),
  })
}

export function useAssignFeature(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ featureId, input }: { featureId: string; input: FeatureAssignInput }) =>
      featuresService.assign(featureId, input),
    onSuccess: (_data, variables) => {
      toast.success('Feature assigned.')
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
      queryClient.invalidateQueries({ queryKey: featureKeys.communities(variables.featureId) })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to assign feature.')),
  })
}

export function useUpdateFeatureAssignment(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      featureId,
      communityId,
      input,
    }: {
      featureId: string
      communityId: string
      input: FeatureUpdateInput
    }) => featuresService.updateAssignment(featureId, communityId, input),
    onSuccess: (_data, variables) => {
      toast.success('Feature assignment updated.')
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
      queryClient.invalidateQueries({ queryKey: featureKeys.communities(variables.featureId) })
      onSuccess?.()
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to update feature assignment.')),
  })
}

export function useRevokeFeature(onSuccess?: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ featureId, communityId }: { featureId: string; communityId: string }) =>
      featuresService.revoke(featureId, communityId),
    onSuccess: (_data, variables) => {
      toast.success('Feature revoked.')
      queryClient.invalidateQueries({ queryKey: featureKeys.all })
      queryClient.invalidateQueries({ queryKey: featureKeys.communities(variables.featureId) })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to revoke feature.')),
  })
}

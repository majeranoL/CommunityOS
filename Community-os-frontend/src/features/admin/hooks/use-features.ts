import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import {
  featuresService,
  type FeatureListParams,
} from '@/features/admin/services/features'
import type {
  FeatureAssignInput,
  FeatureUpdateInput,
} from '@/features/admin/types/feature'

export const featureKeys = {
  all: ['admin', 'features'] as const,
  list: (params: unknown) => ['admin', 'features', 'list', params] as const,
  detail: (id: string) => ['admin', 'features', 'detail', id] as const,
  communities: (featureId: string) => ['admin', 'features', 'communities', featureId] as const,
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

import { useQuery } from '@tanstack/react-query'
import { featuresService } from '@/features/features/services/features'

export const enabledFeatureKeys = {
  all: ['features', 'enabled'] as const,
}

export function useEnabledFeatures() {
  return useQuery({
    queryKey: enabledFeatureKeys.all,
    queryFn: () => featuresService.enabled(),
    placeholderData: (previous) => previous,
  })
}

export function useIsFeatureEnabled(code: string) {
  const { data } = useEnabledFeatures()
  return data?.some((feature) => feature.code === code) ?? false
}

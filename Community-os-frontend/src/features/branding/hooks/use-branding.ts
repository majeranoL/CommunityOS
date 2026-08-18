import { useQuery } from '@tanstack/react-query'
import { brandingService } from '@/features/branding/services/branding'

export const brandingKeys = {
  all: ['branding'] as const,
}

export function useBranding() {
  return useQuery({
    queryKey: brandingKeys.all,
    queryFn: () => brandingService.get(),
    staleTime: 5 * 60 * 1000,
  })
}

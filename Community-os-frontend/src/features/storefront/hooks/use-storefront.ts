import { useQuery } from '@tanstack/react-query'
import { fetchStorefrontCommunity } from '@/features/storefront/services/storefront'

export const storefrontKeys = {
  community: (slug: string) => ['storefront-community', slug] as const,
}

export function useStorefrontCommunity(slug: string | undefined) {
  return useQuery({
    queryKey: storefrontKeys.community(slug ?? ''),
    queryFn: () => fetchStorefrontCommunity(slug as string),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

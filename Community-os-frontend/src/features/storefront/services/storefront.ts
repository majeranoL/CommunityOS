import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { StorefrontCommunity } from '@/features/storefront/types/storefront'

export async function fetchStorefrontCommunity(
  slug: string,
): Promise<StorefrontCommunity> {
  const { data } = await api.get<ApiEnvelope<StorefrontCommunity>>(
    `/public/communities/${encodeURIComponent(slug)}`,
  )
  return data.data
}

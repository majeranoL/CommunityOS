import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { BrandingData, BrandingUpdateInput } from '@/features/branding/types/branding'

export const brandingService = {
  async get(): Promise<BrandingData> {
    const { data } = await api.get<ApiEnvelope<BrandingData>>('/communities/me/branding')
    return data.data
  },

  async update(input: BrandingUpdateInput): Promise<BrandingData> {
    const { data } = await api.patch<ApiEnvelope<BrandingData>>('/communities/me/branding', input)
    return data.data
  },
}

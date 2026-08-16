import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { EnabledFeature } from '@/features/features/types/feature'

export const featuresService = {
  async enabled() {
    const { data } = await api.get<ApiEnvelope<EnabledFeature[]>>('/features')
    return data.data
  },
}

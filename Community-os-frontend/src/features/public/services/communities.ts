import api from '@/lib/api'
import type { ApiEnvelope, CommunitySummary } from '@/types/api'

export async function searchCommunities(query: string) {
  const { data } = await api.get<ApiEnvelope<CommunitySummary[]>>(
    '/public/communities',
    {
      params: { search: query || undefined, limit: 8 },
    },
  )
  return data.data
}

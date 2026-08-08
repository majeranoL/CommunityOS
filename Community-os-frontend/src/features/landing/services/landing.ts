import api from '@/lib/api'
import type { ApiEnvelope, SubscriptionPlan } from '@/types/api'

export async function fetchPlans() {
  const { data } = await api.get<ApiEnvelope<SubscriptionPlan[]>>('/public/plans')
  return data.data
}

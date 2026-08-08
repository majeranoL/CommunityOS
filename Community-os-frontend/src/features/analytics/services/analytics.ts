import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type {
  FinancialAnalytics,
  StatusBreakdown,
  StatusBreakdownEntity,
  TrendRow,
} from '@/features/analytics/types/analytics'

export const analyticsService = {
  async financial(month?: string) {
    const { data } = await api.get<ApiEnvelope<FinancialAnalytics>>('/analytics/financial', {
      params: month ? { month } : undefined,
    })
    return data.data
  },

  async trends(months: number) {
    const { data } = await api.get<ApiEnvelope<TrendRow[]>>('/analytics/trends', {
      params: { months },
    })
    return data.data
  },

  async statusBreakdown(entity: StatusBreakdownEntity) {
    const { data } = await api.get<ApiEnvelope<StatusBreakdown>>('/analytics/status-breakdown')
    return { entity, counts: data.data[entity] }
  },
}

import api from '@/lib/api'
import type { ApiEnvelope } from '@/types/api'
import type { DashboardOverview } from '@/features/dashboard/types/dashboard'

export const dashboardService = {
  async overview() {
    const { data } = await api.get<ApiEnvelope<DashboardOverview>>('/dashboard/overview')
    return data.data
  },
}

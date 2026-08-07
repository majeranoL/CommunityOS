import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/features/dashboard/services/dashboard'

export const dashboardKeys = {
  overview: ['dashboard', 'overview'] as const,
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.overview(),
    staleTime: 30 * 1000,
  })
}

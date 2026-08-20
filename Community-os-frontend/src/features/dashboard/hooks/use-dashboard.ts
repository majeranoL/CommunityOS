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

export function useNavBadges() {
  return useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: () => dashboardService.overview(),
    staleTime: 60 * 1000,
    select: (data) => ({
      complaints: data.counts.openComplaints || undefined,
      reservations: data.counts.pendingReservations || undefined,
      announcements: data.counts.draftAnnouncements || undefined,
    }),
  })
}

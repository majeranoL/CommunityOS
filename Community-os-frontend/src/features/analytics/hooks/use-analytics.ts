import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/features/analytics/services/analytics'
import type { StatusBreakdownEntity } from '@/features/analytics/types/analytics'

export const analyticsKeys = {
  all: ['analytics'] as const,
  financial: (month?: string) => ['analytics', 'financial', month ?? 'current'] as const,
  trends: (months: number) => ['analytics', 'trends', months] as const,
  breakdown: (entity: StatusBreakdownEntity) => ['analytics', 'breakdown', entity] as const,
}

export function useFinancialAnalytics(month?: string) {
  return useQuery({
    queryKey: analyticsKeys.financial(month),
    queryFn: () => analyticsService.financial(month),
    placeholderData: (previous) => previous,
  })
}

export function useTrends(months: number) {
  return useQuery({
    queryKey: analyticsKeys.trends(months),
    queryFn: () => analyticsService.trends(months),
    placeholderData: (previous) => previous,
  })
}

export function useStatusBreakdown(entity: StatusBreakdownEntity) {
  return useQuery({
    queryKey: analyticsKeys.breakdown(entity),
    queryFn: () => analyticsService.statusBreakdown(entity),
    placeholderData: (previous) => previous,
  })
}

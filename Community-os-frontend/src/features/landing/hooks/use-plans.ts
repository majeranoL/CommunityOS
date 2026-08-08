import { useQuery } from '@tanstack/react-query'
import { fetchPlans } from '@/features/landing/services/landing'

export function usePlans() {
  return useQuery({
    queryKey: ['public-plans'],
    queryFn: fetchPlans,
    staleTime: 5 * 60 * 1000,
  })
}

import { useQuery } from '@tanstack/react-query'
import { residentsService } from '@/features/facilities/services/residents'

export const residentKeys = {
  options: (params: unknown) => ['residents', 'options', params] as const,
}

export function useResidentOptions(search: string) {
  return useQuery({
    queryKey: residentKeys.options({ search, limit: 25 }),
    queryFn: () => residentsService.options({ search: search || undefined, limit: 25 }),
    placeholderData: (previous) => previous,
  })
}

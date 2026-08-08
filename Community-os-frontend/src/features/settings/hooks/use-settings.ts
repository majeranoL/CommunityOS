import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { settingsService } from '@/features/settings/services/settings'
import type { UpdateSettingEntry } from '@/features/settings/types/setting'

export const settingsKeys = {
  all: ['settings'] as const,
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: () => settingsService.all(),
    placeholderData: (previous) => previous,
  })
}

export function useUpdateSettings(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: UpdateSettingEntry[]) => settingsService.updateMany(settings),
    onSuccess: () => {
      toast.success('Community settings saved.')
      queryClient.invalidateQueries({ queryKey: settingsKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save settings.')),
  })
}

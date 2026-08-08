import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { platformSettingsService } from '@/features/admin/services/platform-settings'
import type { UpdatePlatformSettingEntry } from '@/features/admin/types/platform-settings'

export const platformSettingsKeys = {
  all: ['admin', 'platform-settings'] as const,
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: platformSettingsKeys.all,
    queryFn: () => platformSettingsService.all(),
    placeholderData: (previous) => previous,
  })
}

export function useUpdatePlatformSettings(onSuccess?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: UpdatePlatformSettingEntry[]) =>
      platformSettingsService.updateMany(settings),
    onSuccess: () => {
      toast.success('Platform settings saved.')
      queryClient.invalidateQueries({ queryKey: platformSettingsKeys.all })
      onSuccess?.()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to save platform settings.')),
  })
}

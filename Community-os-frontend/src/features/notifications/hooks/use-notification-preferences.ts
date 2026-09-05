import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { notificationsService } from '@/features/notifications/services/notifications'
import type { NotificationPreference } from '@/features/notifications/types/notification'

export const preferencesKeys = {
  all: ['notification-preferences'] as const,
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: preferencesKeys.all,
    queryFn: () => notificationsService.getPreferences(),
  })
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (preferences: NotificationPreference[]) =>
      notificationsService.updatePreferences(preferences),
    onSuccess: (settings) => {
      queryClient.setQueryData(preferencesKeys.all, settings)
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Failed to update notification preferences.')),
  })
}
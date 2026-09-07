import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { apiErrorMessage } from '@/lib/api'
import { notificationsService } from '@/features/notifications/services/notifications'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: unknown) => ['notifications', 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  badges: ['notifications', 'badges'] as const,
}

export function useNotifications(params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsService.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => notificationsService.unreadCount(),
    refetchInterval: 60_000,
  })
}

export function useNotificationBadges() {
  return useQuery({
    queryKey: notificationKeys.badges,
    queryFn: () => notificationsService.unreadByModule(),
    refetchInterval: 60_000,
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
  queryClient.invalidateQueries({ queryKey: notificationKeys.badges })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update notification.')),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read.')
      invalidateAll(queryClient)
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to mark notifications as read.')),
  })
}

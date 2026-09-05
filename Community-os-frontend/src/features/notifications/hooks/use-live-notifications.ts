import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { tokenStore } from '@/lib/token'
import { notificationKeys } from '@/features/notifications/hooks/use-notifications'

/**
 * Opens the SSE notification stream and refreshes the unread badge + list
 * whenever a new in-app notification arrives. EventSource reconnects
 * automatically, so no manual reconnection bookkeeping is needed.
 */
export function useLiveNotifications() {
  const queryClient = useQueryClient()
  const authenticated = useAuthStore((state) => state.status === 'authenticated')

  useEffect(() => {
    if (!authenticated) return undefined

    const token = tokenStore.getAccess()
    if (!token) return undefined

    const source = new EventSource(
      `/api/notifications/stream?token=${encodeURIComponent(token)}`,
    )

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount })
    }

    source.addEventListener('notification.created', refresh)

    return () => source.close()
  }, [authenticated, queryClient])
}
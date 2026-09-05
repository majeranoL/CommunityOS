import { useEffect, useState } from 'react'
import { BellOff, BellRing, Mail, Smartphone } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/notifications/hooks/use-notification-preferences'
import type {
  NotificationPreference,
  NotificationType,
} from '@/features/notifications/types/notification'
import {
  disablePushNotifications,
  enablePushNotifications,
  getActivePushSubscription,
  isPushSupported,
  vapidPublicKey,
} from '@/lib/push-notifications'

const MODULE_LABELS: Record<NotificationType, string> = {
  SYSTEM: 'System alerts',
  COMPLAINT: 'Complaints',
  MAINTENANCE: 'Maintenance requests',
  PAYMENT: 'Payments',
  ASSESSMENT: 'Household dues',
  MESSAGE: 'Messages',
  EVENT: 'Events',
  RESERVATION: 'Facility reservations',
  VISITOR: 'Visitors',
  ANNOUNCEMENT: 'Announcements',
  POLL: 'Polls',
  VEHICLE_STICKER: 'Vehicle stickers',
}

export function NotificationSettings() {
  const { data, isLoading } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()
  const [pushBusy, setPushBusy] = useState(false)
  const [pushActive, setPushActive] = useState(false)

  const preferences = (data?.preferences ?? []) as NotificationPreference[]

  const supported = isPushSupported()
  const needsVapid = !vapidPublicKey()

  useEffect(() => {
    let mounted = true
    getActivePushSubscription().then((sub) => {
      if (mounted) setPushActive(Boolean(sub))
    })
    return () => {
      mounted = false
    }
  }, [])

  const setPreference = (module: NotificationType, patch: Partial<NotificationPreference>) => {
    const next = preferences.map((p) =>
      p.module === module ? { ...p, ...patch } : p,
    )
    update.mutate(next)
  }

  const togglePush = async () => {
    setPushBusy(true)
    try {
      if (pushActive) {
        await disablePushNotifications()
        setPushActive(false)
        toast.success('Push notifications disabled.')
      } else {
        const result = await enablePushNotifications()
        if (result.ok) {
          setPushActive(true)
          toast.success(result.message)
        } else {
          toast.error(result.message)
        }
      }
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Browser push
          </CardTitle>
          <CardDescription>
            Allow notifications to appear on your device even when CommunityOS is not open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!supported ? (
            <p className="text-sm text-muted-foreground">
              Your browser does not support push notifications.
            </p>
          ) : needsVapid ? (
            <p className="text-sm text-muted-foreground">
              Push notifications are not configured for this community yet.
            </p>
          ) : !('Notification' in window) || Notification.permission === 'denied' ? (
            <p className="text-sm text-muted-foreground">
              Push notifications are blocked in your browser settings. Unblock the site to
              enable them.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                {pushActive ? (
                  <BellRing className="h-4 w-4 text-primary" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">
                  {pushActive ? 'Push notifications are on' : 'Push notifications are off'}
                </span>
              </div>
              <Button variant={pushActive ? 'outline' : 'default'} size="sm" onClick={togglePush} disabled={pushBusy}>
                {pushBusy ? 'Working…' : pushActive ? 'Turn off' : 'Turn on'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email notifications
          </CardTitle>
          <CardDescription>
            Opt in to receive email alerts. Email is off by default; enable only what you want.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-1">
              {Object.keys(MODULE_LABELS).map((key) => {
                const module = key as NotificationType
                const pref = preferences.find((p) => p.module === module)
                if (!pref) return null
                return (
                  <div
                    key={module}
                    className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{MODULE_LABELS[module]}</p>
                      <p className="text-xs text-muted-foreground">In-app always on</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="hidden sm:inline">Email</span>
                        <Switch
                          checked={pref.emailEnabled}
                          onCheckedChange={(checked) =>
                            setPreference(module, { emailEnabled: checked })
                          }
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="hidden sm:inline">Push</span>
                        <Switch
                          checked={pref.pushEnabled}
                          onCheckedChange={(checked) =>
                            setPreference(module, { pushEnabled: checked })
                          }
                          disabled={!pushActive}
                          title={
                            pushActive
                              ? undefined
                              : 'Turn on browser push above to enable push for modules'
                          }
                        />
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
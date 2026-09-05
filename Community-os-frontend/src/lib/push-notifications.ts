import { notificationsService } from '@/features/notifications/services/notifications'

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export function vapidPublicKey(): string | null {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || null
}

export function getPermissionState(): string {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    return (await registration?.pushManager.getSubscription()) ?? null
  } catch {
    return null
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export async function enablePushNotifications(): Promise<{ ok: boolean; message: string }> {
  const key = vapidPublicKey()
  if (!key) {
    return {
      ok: false,
      message: 'Push is not configured yet. Ask your admin to set VITE_VAPID_PUBLIC_KEY.',
    }
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    return { ok: false, message: 'Your browser does not support push notifications.' }
  }

  if (Notification.permission === 'denied') {
    return { ok: false, message: 'Push notifications are blocked in your browser settings.' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, message: 'Permission to send notifications was not granted.' }
  }

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ?? (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }))

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, message: 'Could not read browser push details.' }
  }

  const saved = await notificationsService.pushSubscribe({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  })

  if (saved) {
    return { ok: true, message: 'Push notifications enabled.' }
  }
  return { ok: false, message: 'Failed to enable push notifications.' }
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await getActivePushSubscription()
  if (subscription) {
    await notificationsService.pushUnsubscribe(subscription.endpoint)
    try {
      await subscription.unsubscribe()
    } catch {
      // ignore local unsubscribe errors; the server record is already gone
    }
  }
}
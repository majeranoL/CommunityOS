export type NotificationType =
  | 'SYSTEM'
  | 'COMPLAINT'
  | 'MAINTENANCE'
  | 'PAYMENT'
  | 'ASSESSMENT'
  | 'MESSAGE'
  | 'EVENT'
  | 'RESERVATION'
  | 'VISITOR'
  | 'ANNOUNCEMENT'
  | 'POLL'
  | 'VEHICLE_STICKER'

export type NotificationChannel = 'IN_APP' | 'PUSH' | 'EMAIL'

export interface AppNotification {
  id: string
  communityId: string
  userId: string
  type: NotificationType
  title: string
  message: string | null
  link: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationPreference {
  module: NotificationType
  inAppEnabled: boolean
  pushEnabled: boolean
  emailEnabled: boolean
}

export interface NotificationSettings {
  preferences: NotificationPreference[]
}

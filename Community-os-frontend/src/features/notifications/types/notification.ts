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

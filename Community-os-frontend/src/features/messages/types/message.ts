export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ'

export interface MessageUserRef {
  id: string
  firstName: string
  lastName: string
}

export interface MessageListItem {
  id: string
  senderId: string
  sender: MessageUserRef
  recipientId: string | null
  recipient: MessageUserRef | null
  subject: string
  body: string
  status: MessageStatus
  sentAt: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateMessageInput {
  recipientId?: string
  subject: string
  body: string
}

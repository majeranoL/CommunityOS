export type EventStatus = 'DRAFT' | 'UPCOMING' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'

export interface EventOrganizer {
  id: string
  firstName: string
  lastName: string
}

export interface CommunityEvent {
  id: string
  communityId: string
  organizerId: string | null
  title: string
  description: string | null
  location: string | null
  startAt: string
  endAt: string | null
  coverImageUrl: string | null
  status: EventStatus
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  organizer: EventOrganizer | null
}

export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  startAt: string
  endAt?: string
  coverImageUrl?: string
  status?: EventStatus
}

export interface UpdateEventInput {
  title?: string
  description?: string
  location?: string
  startAt?: string
  endAt?: string
  coverImageUrl?: string
  status?: EventStatus
}

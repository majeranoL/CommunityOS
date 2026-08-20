export type EventStatus = 'DRAFT' | 'UPCOMING' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'

export type EventCategory = 'GENERAL' | 'MEETING' | 'SOCIAL' | 'SPORTS' | 'WORKSHOP' | 'FUNDRAISER' | 'OTHER'

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
  category: EventCategory
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  organizer: EventOrganizer | null
  _count?: { attendees: number }
  attendees?: { id: string }[]
}

export interface CreateEventInput {
  title: string
  description?: string
  location?: string
  startAt: string
  endAt?: string
  coverImageUrl?: string
  status?: EventStatus
  category?: EventCategory
}

export interface UpdateEventInput {
  title?: string
  description?: string
  location?: string
  startAt?: string
  endAt?: string
  coverImageUrl?: string
  status?: EventStatus
  category?: EventCategory
}

export interface EventAttendeeUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

export interface EventAttendee {
  id: string
  eventId: string
  userId: string
  createdAt: string
  user: EventAttendeeUser
}

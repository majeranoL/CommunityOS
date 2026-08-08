export type AnnouncementStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED'

export interface AnnouncementListItem {
  id: string
  title: string
  coverImageUrl: string | null
  status: AnnouncementStatus
  publishedAt: string | null
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  coverImageUrl: string | null
  status: AnnouncementStatus
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAnnouncementInput {
  title: string
  content: string
  coverImageUrl?: string
  status?: AnnouncementStatus
}

export interface UpdateAnnouncementInput {
  title?: string
  content?: string
  coverImageUrl?: string
  status?: AnnouncementStatus
}

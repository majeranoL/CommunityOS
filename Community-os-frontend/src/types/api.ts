export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  pagination?: Pagination
}

export interface CommunitySummary {
  id: string
  code: string
  slug: string
  displayName: string
}

export interface HouseholdSummary {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
}

export interface ResidentSummary {
  id: string
  residentNumber: string
  household: HouseholdSummary | null
}

export interface SessionUser {
  id: string
  referenceNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phoneNumber: string | null
  avatarUrl: string | null
  status?: string
  community: CommunitySummary
  resident: ResidentSummary | null
  roles: string[]
  permissions: string[]
}

export interface Session {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

export interface UserRow {
  id: string
  referenceNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  email: string
  phoneNumber: string | null
  avatarUrl: string | null
  status: string
  createdAt: string
  roles?: { role: { id: string; name: string } }[]
  community?: CommunitySummary
}

export interface RoleRow {
  id: string
  name: string
  description: string | null
  isSystem: boolean
}

export interface ListQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  order?: 'asc' | 'desc'
  status?: string
  category?: string
  priority?: string
  type?: string
  [key: string]: unknown
}

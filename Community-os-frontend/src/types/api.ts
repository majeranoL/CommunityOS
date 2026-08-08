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
  isPlatformAdmin?: boolean
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

// ==============================================
// SUBSCRIPTIONS / BILLING
// ==============================================

export interface SubscriptionPlan {
  id: string
  code: string
  name: string
  description: string | null
  price: string | number
  billingCycle: 'MONTHLY' | 'YEARLY'
  features: string[]
  maxUsers: number
  maxResidents: number
  isActive: boolean
  sortOrder: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  amount: string | number
  billingCycle: 'MONTHLY' | 'YEARLY'
  status: string
  dueDate: string
  paidAt: string | null
  paymentMethod: string | null
  notes: string | null
  createdAt: string
}

export interface Subscription {
  id: string
  communityId: string
  planId: string | null
  status: string
  startsAt: string
  endsAt: string
  trialEndsAt: string | null
  autoRenew: boolean
  cancelledAt: string | null
  plan: SubscriptionPlan | null
  invoices?: Invoice[]
}

export interface BillingSummary {
  subscription: {
    status: string
    plan: {
      code: string
      name: string
      price: string | number
      billingCycle: string
    } | null
    startsAt: string | null
    endsAt: string | null
  } | null
  invoices: {
    byStatus: Record<string, number>
    total: number
    outstandingAmount: string | number
    expiringWithin30Days: number
  }
}

export interface BillingLimits {
  plan: {
    code: string
    name: string
    maxUsers: number
    maxResidents: number
  } | null
  status: string | null
  usage: {
    users: number
    residents: number
    households: number
  }
  limits: {
    users: number
    residents: number
  }
  exceeded: {
    users: boolean
    residents: boolean
  }
}

// ==============================================
// PLATFORM ADMIN
// ==============================================

export interface AdminOverview {
  totalCommunities: number
  activeCommunities: number
  totalUsers: number
  totalResidents: number
  activeSubscriptions: number
  trialSubscriptions: number
  recentSignups: number
  collectedRevenue: string | number
}

export interface AdminCommunity {
  id: string
  code: string
  slug: string
  displayName: string
  email: string | null
  contactNumber: string | null
  address: string | null
  logoUrl: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    residents: number
    households: number
  }
  subscription?: {
    id: string
    status: string
    startsAt: string
    endsAt: string
    trialEndsAt: string | null
    plan: { id: string; code: string; name: string; price: string | number } | null
  } | null
}

export interface AdminCommunityDetail {
  id: string
  code: string
  slug: string
  displayName: string
  description: string | null
  email: string | null
  contactNumber: string | null
  address: string | null
  logoUrl: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
  _count: {
    users: number
    residents: number
    households: number
    facilities: number
    announcements: number
    complaints: number
    events: number
  }
  subscription: {
    id: string
    status: string
    startsAt: string
    endsAt: string
    trialEndsAt: string | null
    autoRenew: boolean
    plan: {
      id: string
      code: string
      name: string
      description: string | null
      price: string | number
      billingCycle: string
    } | null
  } | null
  users: {
    id: string
    firstName: string
    lastName: string
    isPlatformAdmin: boolean
    status: string
    account: { email: string }
    roles: { role: { name: string } }[]
  }[]
}

// ==============================================
// PUBLIC SIGNUP
// ==============================================

export interface HoaSignupInput {
  displayName: string
  description?: string
  email?: string
  contactNumber?: string
  address?: string
  logoUrl?: string
  planId?: string
  owner: {
    firstName: string
    lastName: string
    email: string
    password: string
  }
}

export interface HoaSignupResult {
  community: CommunitySummary
  subscription: {
    id: string
    status: string
    planId: string | null
    endsAt: string
  } | null
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  session: Session
}

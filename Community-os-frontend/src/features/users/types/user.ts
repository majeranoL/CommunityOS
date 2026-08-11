export interface UserRoleSummary {
  id: string
  name: string
}

export interface UserListItem {
  id: string
  accountId: string
  communityId: string
  referenceNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  phoneNumber: string | null
  avatarUrl: string | null
  email: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'REJECTED'
  household: {
    id: string
    block: string | null
    lot: string | null
    unit: string | null
    address: string | null
    status: string
  } | null
  roles: UserRoleSummary[]
  createdAt: string
  updatedAt: string
}

export interface RoleSummary {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissionCount?: number
}

export interface CreateUserInput {
  email: string
  password: string
  firstName: string
  middleName?: string
  lastName: string
  phoneNumber?: string
  roleId: string
}

export interface CreateRenterInput {
  email: string
  firstName: string
  middleName?: string
  lastName: string
  phoneNumber?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  householdId: string
}

export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  status?: UserListItem['status']
}

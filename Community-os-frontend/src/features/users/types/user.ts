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
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
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

export interface UpdateUserInput {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  status?: UserListItem['status']
}

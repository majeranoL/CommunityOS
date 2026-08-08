export interface PermissionItem {
  id: string
  code: string
  module: string
  description: string
  createdAt?: string
  updatedAt?: string
}

export interface RoleListItem {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  userCount: number
  permissionCount: number
  createdAt: string
  updatedAt: string
}

export interface RoleDetail {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  userCount: number
  permissions: PermissionItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoleInput {
  name: string
  description?: string
  isSystem?: boolean
}

export interface UpdateRoleInput {
  name?: string
  description?: string
  isSystem?: boolean
}

export interface AssignPermissionsInput {
  permissionIds: string[]
}

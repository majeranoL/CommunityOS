export type StaffRole = 'SECURITY' | 'MAINTENANCE' | 'CLEANING' | 'ADMIN' | 'OTHER'
export type StaffStatus = 'ACTIVE' | 'INACTIVE'

export interface AssignedMaintenanceRef {
  id: string
  maintenanceNumber: string
  title: string
  category: string
  priority: string
  status: string
}

export interface StaffListItem {
  id: string
  staffNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  role: StaffRole
  phoneNumber: string | null
  email: string | null
  hireDate: string | null
  notes: string | null
  status: StaffStatus
  createdAt: string
  maintenanceCount: number
}

export interface StaffDetail extends Omit<StaffListItem, 'maintenanceCount'> {
  assignedMaintenances: AssignedMaintenanceRef[]
}

export interface CreateStaffInput {
  staffNumber: string
  firstName: string
  middleName?: string
  lastName: string
  role?: StaffRole
  phoneNumber?: string
  email?: string
  hireDate?: string
  notes?: string
  status?: StaffStatus
}

export interface UpdateStaffInput {
  staffNumber?: string
  firstName?: string
  middleName?: string | null
  lastName?: string
  role?: StaffRole
  phoneNumber?: string | null
  email?: string | null
  hireDate?: string
  notes?: string | null
  status?: StaffStatus
}

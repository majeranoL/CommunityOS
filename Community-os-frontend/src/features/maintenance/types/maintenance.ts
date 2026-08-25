export type MaintenanceCategory =
  | 'ELECTRICAL'
  | 'PLUMBING'
  | 'LANDSCAPING'
  | 'STRUCTURAL'
  | 'ROADS'
  | 'FACILITY'
  | 'CLEANING'
  | 'OTHER'

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type MaintenanceStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CANCELLED'

export interface FacilityRef {
  id: string
  name: string
}

export interface StaffRef {
  id: string
  firstName: string
  lastName: string
}

export interface MaintenanceAttachment {
  id: string
  url: string
  filename: string
  originalName: string
  mimetype: string
  size: number
}

export interface MaintenanceListItem {
  id: string
  maintenanceNumber: string
  title: string
  description: string | null
  category: MaintenanceCategory
  priority: MaintenancePriority
  facilityId: string | null
  facility: FacilityRef | null
  assignedToId: string | null
  assignedTo: StaffRef | null
  cost: number | null
  scheduledAt: string | null
  completedAt: string | null
  remarks: string | null
  attachmentFileIds?: string[]
  attachments?: MaintenanceAttachment[]
  status: MaintenanceStatus
  createdAt: string
}

export interface CreateMaintenanceInput {
  maintenanceNumber: string
  title: string
  description?: string
  category: MaintenanceCategory
  priority?: MaintenancePriority
  facilityId?: string
  assignedToId?: string
  cost?: number
  scheduledAt?: string
  remarks?: string
  attachmentFileIds?: string[]
  status?: MaintenanceStatus
}

export interface UpdateMaintenanceInput {
  maintenanceNumber?: string
  title?: string
  description?: string | null
  category?: MaintenanceCategory
  priority?: MaintenancePriority
  facilityId?: string | null
  assignedToId?: string | null
  cost?: number | null
  scheduledAt?: string
  remarks?: string | null
  attachmentFileIds?: string[]
  status?: MaintenanceStatus
}

export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type ComplaintCategory =
  | 'SECURITY'
  | 'NOISE'
  | 'SANITATION'
  | 'PARKING'
  | 'PETS'
  | 'FACILITY'
  | 'UTILITIES'
  | 'NEIGHBOR'
  | 'OTHER'

export interface ComplaintResident {
  id: string
  firstName?: string
  middleName?: string | null
  lastName?: string
  fullName: string
}

export interface ComplaintListItem {
  id: string
  complaintNumber: string
  title: string
  category: ComplaintCategory
  priority: ComplaintPriority
  status: ComplaintStatus
  resident: ComplaintResident
  createdAt: string
  updatedAt: string
}

export interface Complaint extends ComplaintListItem {
  description: string
  remarks: string | null
}

export interface CreateComplaintInput {
  residentId: string
  title: string
  description: string
  category: ComplaintCategory
  priority?: ComplaintPriority
  remarks?: string
}

export interface UpdateComplaintInput {
  residentId?: string
  title?: string
  description?: string
  category?: ComplaintCategory
  priority?: ComplaintPriority
  remarks?: string
}

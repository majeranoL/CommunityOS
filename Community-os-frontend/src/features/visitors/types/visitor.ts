export type VisitorStatus = 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'

export type VisitorCategory = 'ONE_TIME' | 'RECURRING' | 'SERVICE_PROVIDER' | 'CONTRACTOR' | 'DELIVERY' | 'OTHER'

export interface VisitorRef {
  id: string
  firstName: string
  lastName: string
}

export interface VisitorVehicleRef {
  id: string
  plateNumber: string
}

export interface VisitorListItem {
  id: string
  name: string
  phoneNumber: string | null
  purpose: string | null
  hostResidentId: string | null
  hostResident: VisitorRef | null
  vehicleId: string | null
  vehicle: VisitorVehicleRef | null
  entryAt: string | null
  exitAt: string | null
  remarks: string | null
  status: VisitorStatus
  category: VisitorCategory
  createdAt: string
}

export interface CreateVisitorInput {
  name: string
  phoneNumber?: string
  purpose?: string
  hostResidentId?: string
  vehicleId?: string
  entryAt?: string
  exitAt?: string
  remarks?: string
  category?: VisitorCategory
  status?: VisitorStatus
}

export type VehicleType =
  'CAR' | 'MOTORCYCLE' | 'TRUCK' | 'VAN' | 'BICYCLE' | 'OTHER'
export type VehicleStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'DEACTIVATED'
  | 'TRANSFERRED'
  | 'INACTIVE'

export interface VehicleResidentRef {
  id: string
  firstName: string
  lastName: string
}

export interface VehicleListItem {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null
  type: VehicleType | null
  parkingStickerNumber: string | null
  status: VehicleStatus
  resident: VehicleResidentRef | null
  residentId: string | null
  verifiedById: string | null
  verifiedAt: string | null
  verificationRemarks: string | null
  createdAt: string
}

export interface CreateVehicleInput {
  plateNumber: string
  make?: string
  model?: string
  color?: string
  type?: VehicleType
  residentId?: string
  parkingStickerNumber?: string
  status?: VehicleStatus
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>

export interface VerifyVehicleInput {
  approved: boolean
  remarks?: string
}

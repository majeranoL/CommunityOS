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

export interface VehicleStickerRef {
  id: string
  stickerNumber: string | null
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'
  expirationDate: string | null
}

export interface VehicleListItem {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null
  type: VehicleType | null
  hasSticker?: boolean
  parkingStickerNumber: string | null
  photoUrl?: string | null
  status: VehicleStatus
  resident: VehicleResidentRef | null
  residentId: string | null
  verifiedById: string | null
  verifiedAt: string | null
  verificationRemarks: string | null
  stickers?: VehicleStickerRef[]
  createdAt: string
}

export interface CreateVehicleInput {
  plateNumber: string
  make?: string
  model?: string
  color?: string
  type?: VehicleType
  residentId?: string
  hasSticker?: boolean
  parkingStickerNumber?: string
  photoUrl?: string
}

export type UpdateVehicleInput = Partial<CreateVehicleInput>

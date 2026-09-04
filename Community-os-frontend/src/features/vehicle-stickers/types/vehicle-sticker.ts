export type StickerStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'

export interface StickerVehicleRef {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null
}

export interface StickerUserRef {
  id: string
  firstName: string
  lastName: string
}

export interface StickerAssessmentRef {
  id: string
  assessmentNumber: string
  amount: string
  status: string
}

export interface VehicleStickerListItem {
  id: string
  stickerNumber: string | null
  issueDate: string | null
  expirationDate: string | null
  photoUrl: string | null
  status: StickerStatus
  notes: string | null
  verifiedById: string | null
  verifiedAt: string | null
  verificationRemarks: string | null
  vehicle: StickerVehicleRef
  createdBy: StickerUserRef
  verifiedBy: StickerUserRef | null
  assessment: StickerAssessmentRef | null
  createdAt: string
}

export interface CreateStickerInput {
  vehicleId: string
  stickerNumber: string
  issueDate: string
  expirationDate: string
  notes?: string
  photoUrl?: string
}

export interface RequestStickerInput {
  vehicleId: string
  notes?: string
}

export interface StickerOptions {
  price: number
  validityDays: number
}

export type UpdateStickerInput = Partial<CreateStickerInput> & {
  status?: StickerStatus
}

export interface VerifyStickerInput {
  approved: boolean
  remarks?: string
}

export interface RenewStickerInput {
  expirationDate: string
  notes?: string
}

export type StickerStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED'
export type StickerRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface StickerVehicleRef {
  id: string
  plateNumber: string
  make: string | null
  model: string | null
  color: string | null
  residentId: string | null
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
  dueDate?: string | null
}

export interface IssuedStickerRef {
  id: string
  stickerNumber: string | null
  status: StickerStatus
  issueDate: string | null
  expirationDate: string | null
}

export interface StickerRequestListItem {
  id: string
  requestNumber: string
  quantity: number
  feeTotal: string
  status: StickerRequestStatus
  notes: string | null
  requestedStickerNumber: string | null
  reviewRemarks: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  vehicle: StickerVehicleRef
  requestedBy: StickerUserRef
  approvedBy: StickerUserRef | null
  assessment: StickerAssessmentRef | null
  stickers: IssuedStickerRef[]
}

export interface CreateStickerInput {
  vehicleId: string
  stickerNumber?: string
  issueDate?: string
  expirationDate?: string
  quantity?: number
  notes?: string
  photoUrl?: string
}

export interface RequestStickerInput {
  vehicleId: string
  quantity?: number
  notes?: string
  stickerNumber?: string
}

export interface StickerCycleInfo {
  enabled: boolean
  start: string | null
  end: string | null
  activeFrom: string | null
  activeExpiration: string
}

export interface StickerOptions {
  price: number
  validityDays: number
  maxQuantity: number
  quantityEnabled: boolean
  cycle: StickerCycleInfo
}

export interface StickerSettingsInput {
  cycleEnabled?: boolean
  cycleStart?: string
  cycleEnd?: string
  maxQuantity?: number
  price?: number
}

export type UpdateStickerInput = Partial<CreateStickerInput> & {
  status?: StickerStatus
}

export interface VerifyStickerInput {
  approved: boolean
  remarks?: string
  stickerNumber?: string
}

export interface RenewStickerInput {
  expirationDate: string
  notes?: string
}
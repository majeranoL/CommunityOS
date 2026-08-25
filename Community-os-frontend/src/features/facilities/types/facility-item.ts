export type FacilityItemCategory =
  | 'CHAIRS'
  | 'TABLES'
  | 'TENTS'
  | 'SOUND_SYSTEM'
  | 'LIGHTING'
  | 'KITCHEN'
  | 'SPORTS'
  | 'OTHER'

export const facilityItemCategories: { value: FacilityItemCategory; label: string }[] = [
  { value: 'CHAIRS', label: 'Chairs' },
  { value: 'TABLES', label: 'Tables' },
  { value: 'TENTS', label: 'Tents' },
  { value: 'SOUND_SYSTEM', label: 'Sound system' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'SPORTS', label: 'Sports equipment' },
  { value: 'OTHER', label: 'Other' },
]

export interface FacilityItem {
  id: string
  name: string
  category: string | null
  description: string | null
  imageUrl: string | null
  quantityTotal: number
  quantityAvailable: number
  borrowFee: string | number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface FacilityItemInput {
  name: string
  category?: string
  description?: string
  quantityTotal: number
  borrowFee?: number | null
  isActive?: boolean
}

export type FacilityItemLoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'RETURNED'
  | 'REJECTED'
  | 'CANCELLED'

export interface FacilityItemLoan {
  id: string
  loanNumber: string
  itemId: string
  item: FacilityItem
  residentId: string
  resident: {
    id: string
    firstName: string
    lastName: string
  }
  quantity: number
  purpose: string | null
  neededFrom: string
  neededUntil: string
  feePerUnit: string | number | null
  totalFee: string | number | null
  status: FacilityItemLoanStatus
  assessmentId: string | null
  approvedAt: string | null
  returnedAt: string | null
  rejectionReason: string | null
  remarks: string | null
  createdAt: string
}

export interface BorrowItemInput {
  quantity: number
  purpose?: string
  neededFrom: string
  neededUntil: string
}

export type HouseholdStatus = 'ACTIVE' | 'INACTIVE'
export type HouseholdStanding = 'GOOD' | 'BAD'
export type ResidentType = 'OWNER' | 'RENTER'

export interface HouseholdFinanceSummary {
  totalBilled: number
  totalPaid: number
  outstanding: number
  monthsBehind: number
  standing: HouseholdStanding
}

export interface HouseholdResident {
  id: string
  residentNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  status: string
  residentType: ResidentType
  movedOutAt: string | null
  createdAt: string
  user: {
    id: string
    referenceNumber: string
    firstName: string
    lastName: string
    status: string
    account: { email: string }
  } | null
}

export interface HouseholdAssessment {
  id: string
  assessmentNumber: string
  title: string
  period: string | null
  amount: string | number
  paidAmount: string | number
  dueDate: string
  status: string
  payments: Array<{
    id: string
    paymentNumber: string
    amount: string | number
    paymentDate: string
    method: string | null
    referenceNumber: string | null
    status: string
  }>
}

export interface HouseholdListItem {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
  status: HouseholdStatus
  residentCount: number
  finance: HouseholdFinanceSummary | null
  createdAt: string
  updatedAt: string
}

export interface OccupancyHistory {
  current: HouseholdResident[]
  former: HouseholdResident[]
  total: number
  owner: HouseholdResident | null
}

export interface HouseholdDetail extends HouseholdListItem {
  residents: HouseholdResident[]
  assessments: HouseholdAssessment[]
  occupancyHistory?: OccupancyHistory
}

export interface CreateHouseholdInput {
  block?: string
  lot?: string
  unit?: string
  address?: string
  status?: HouseholdStatus
}

export interface UpdateHouseholdInput {
  block?: string
  lot?: string
  unit?: string
  address?: string
  status?: HouseholdStatus
}

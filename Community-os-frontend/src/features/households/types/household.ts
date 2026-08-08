export type HouseholdStatus = 'ACTIVE' | 'INACTIVE'

export interface HouseholdResident {
  id: string
  residentNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  status: string
  user: {
    id: string
    referenceNumber: string
    firstName: string
    lastName: string
    status: string
    account: { email: string }
  } | null
}

export interface HouseholdListItem {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
  status: HouseholdStatus
  residentCount: number
  createdAt: string
  updatedAt: string
}

export interface HouseholdDetail extends HouseholdListItem {
  residents: HouseholdResident[]
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

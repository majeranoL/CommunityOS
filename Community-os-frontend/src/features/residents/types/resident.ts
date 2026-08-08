export type ResidentStatus = 'ACTIVE' | 'INACTIVE' | 'MOVED_OUT' | 'DECEASED'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type CivilStatus = 'SINGLE' | 'MARRIED' | 'WIDOWED' | 'DIVORCED' | 'SEPARATED'

export interface HouseholdReference {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
  status: string
}

export interface ResidentListItem {
  id: string
  residentNumber: string
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
  gender: Gender | null
  civilStatus: CivilStatus | null
  phoneNumber: string | null
  email: string | null
  block: string | null
  lot: string | null
  household: HouseholdReference | null
  status: ResidentStatus
  createdAt: string
}

export interface ResidentDetail extends ResidentListItem {
  householdId: string | null
  birthDate: string | null
  street: string | null
  address: string | null
  profilePhotoUrl: string | null
  remarks: string | null
  updatedAt: string
}

export interface CreateResidentInput {
  householdId?: string
  firstName: string
  middleName?: string
  lastName: string
  suffix?: string
  birthDate?: string
  gender?: Gender
  civilStatus?: CivilStatus
  phoneNumber?: string
  email?: string
  block?: string
  lot?: string
  street?: string
  address?: string
  profilePhotoUrl?: string
  remarks?: string
}

export interface UpdateResidentInput extends Partial<CreateResidentInput> {
  status?: ResidentStatus
}

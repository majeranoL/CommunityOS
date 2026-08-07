export type FacilityType =
  | 'CLUBHOUSE'
  | 'FUNCTION_ROOM'
  | 'POOL'
  | 'GYM'
  | 'COURT'
  | 'PARK'
  | 'PLAYGROUND'
  | 'GARDEN'
  | 'OTHER'

export type FacilityStatus = 'AVAILABLE' | 'MAINTENANCE' | 'CLOSED'

export interface Facility {
  id: string
  name: string
  type: FacilityType
  description: string | null
  location: string | null
  capacity: number | null
  imageUrl: string | null
  hourlyRate: number | null
  status: FacilityStatus
  createdAt: string
  updatedAt: string
}

export type FacilityListItem = Facility

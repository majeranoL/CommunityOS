import type { FacilityType } from '@/features/facilities/types/facility'

export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'

export interface Reservation {
  id: string
  communityId: string
  facilityId: string
  residentId: string
  purpose: string | null
  startAt: string
  endAt: string
  remarks: string | null
  status: ReservationStatus
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  facility: {
    id: string
    name: string
    type: FacilityType
  }
  resident: {
    id: string
    firstName: string
    lastName: string
  }
}

export type ReservationListItem = Reservation

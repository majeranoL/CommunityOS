export type PetSpecies =
  | 'DOG'
  | 'CAT'
  | 'BIRD'
  | 'FISH'
  | 'REPTILE'
  | 'SMALL_ANIMAL'
  | 'OTHER'
export type PetStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'DEACTIVATED'
  | 'INACTIVE'

export interface PetResidentRef {
  id: string
  firstName: string
  lastName: string
}

export interface PetHouseholdRef {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
  address: string | null
}

export interface PetListItem {
  id: string
  petNumber: string
  name: string
  species: PetSpecies
  breed: string | null
  sex: string | null
  color: string | null
  birthDate: string | null
  photoUrl: string | null
  registrationNumber: string | null
  microchipNumber: string | null
  vaccinationCertificateUrl: string | null
  rabiesCertificateUrl: string | null
  veterinaryCertificateUrl: string | null
  remarks: string | null
  status: PetStatus
  household: PetHouseholdRef | null
  resident: PetResidentRef | null
  residentId: string | null
  verifiedById: string | null
  verifiedAt: string | null
  verificationRemarks: string | null
  createdAt: string
}

export interface CreatePetInput {
  name: string
  species?: PetSpecies
  breed?: string
  sex?: string
  color?: string
  birthDate?: string
  photoUrl?: string
  registrationNumber?: string
  microchipNumber?: string
  vaccinationCertificateUrl?: string
  rabiesCertificateUrl?: string
  veterinaryCertificateUrl?: string
  remarks?: string
  householdId?: string
  residentId?: string
  status?: PetStatus
}

export type UpdatePetInput = Partial<CreatePetInput>

export interface VerifyPetInput {
  approved: boolean
  remarks?: string
}

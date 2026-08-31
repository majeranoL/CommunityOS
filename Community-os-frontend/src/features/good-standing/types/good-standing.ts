export type HouseholdStanding = 'GOOD' | 'BAD'

export interface GoodStandingQR {
  token: string
  householdId: string
  standing: HouseholdStanding
  expiresAt: string
  createdAt: string
}

export interface GoodStandingVerification {
  token: string
  standing: HouseholdStanding
  issuedStanding: HouseholdStanding
  expiresAt: string
  household: {
    id: string
    block: string | null
    lot: string | null
    unit: string | null
    address: string | null
    residents: { fullName: string }[]
  }
}

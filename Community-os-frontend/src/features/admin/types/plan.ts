export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type PlanTier = 'STANDARD' | 'CUSTOM'

export interface AdminPlan {
  id: string
  code: string
  name: string
  description: string | null
  price: string | number
  billingCycle: BillingCycle
  tier: PlanTier
  features: string[]
  maxUsers: number
  maxResidents: number
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type AdminPlanInput = {
  code: string
  name: string
  description?: string
  price: number
  billingCycle?: BillingCycle
  tier?: PlanTier
  features?: string[]
  maxUsers?: number
  maxResidents?: number
  isActive?: boolean
  sortOrder?: number
}

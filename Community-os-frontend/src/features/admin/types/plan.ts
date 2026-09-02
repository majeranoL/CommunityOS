export type BillingCycle = 'MONTHLY' | 'YEARLY'
export type PlanTier = 'STANDARD' | 'CUSTOM'

export interface AdminPlanFeature {
  feature: {
    id: string
    code: string
    name: string
    description: string | null
    type: 'STANDARD' | 'OPTIONAL'
  }
}

export interface AdminPlan {
  id: string
  code: string
  name: string
  description: string | null
  price: string | number
  billingCycle: BillingCycle
  tier: PlanTier
  features: string[]
  featureIds?: string[]
  planFeatures?: AdminPlanFeature[]
  isActive: boolean
  includesAllFeatures: boolean
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
  featureIds?: string[]
  isActive?: boolean
  includesAllFeatures?: boolean
  sortOrder?: number
}

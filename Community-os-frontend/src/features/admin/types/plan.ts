export type BillingCycle = 'MONTHLY' | 'YEARLY'

export interface AdminPlan {
  id: string
  code: string
  name: string
  description: string | null
  price: string | number
  billingCycle: BillingCycle
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
  features?: string[]
  maxUsers?: number
  maxResidents?: number
  isActive?: boolean
  sortOrder?: number
}

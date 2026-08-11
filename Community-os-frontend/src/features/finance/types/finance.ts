export type AssessmentStatus =
  'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'REFUNDED'
export type PaymentMethod =
  'CASH' | 'BANK_TRANSFER' | 'GCASH' | 'CREDIT_CARD' | 'CHEQUE' | 'OTHER'

export interface HouseholdRef {
  id: string
  block: string | null
  lot: string | null
  unit: string | null
}

export interface AssessmentListItem {
  id: string
  assessmentNumber: string
  title: string
  description: string | null
  householdId: string
  amount: string | number
  dueDate: string
  period: string | null
  paidAmount: string | number
  remarks: string | null
  status: AssessmentStatus
  createdAt: string
  updatedAt: string
  household: HouseholdRef | null
}

export interface AssessmentPaymentRef {
  id: string
  paymentNumber: string
  amount: string | number
  paymentDate: string
  method: PaymentMethod
  status: PaymentStatus
}

export interface Assessment extends AssessmentListItem {
  payments: AssessmentPaymentRef[]
}

export interface CreateAssessmentInput {
  assessmentNumber: string
  title: string
  description?: string
  householdId: string
  amount: number
  dueDate: string
  period?: string
  remarks?: string
  status?: AssessmentStatus
}

export interface UpdateAssessmentInput {
  assessmentNumber?: string
  title?: string
  description?: string
  householdId?: string
  amount?: number
  dueDate?: string
  period?: string
  remarks?: string
  status?: AssessmentStatus
}

export interface PaymentListItem {
  id: string
  paymentNumber: string
  amount: string | number
  paymentDate: string
  method: PaymentMethod
  referenceNumber: string | null
  remarks: string | null
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  assessment: { id: string; assessmentNumber: string; title: string } | null
  resident: { id: string; firstName: string; lastName: string } | null
}

export type Payment = PaymentListItem

export interface CreatePaymentInput {
  paymentNumber: string
  assessmentId: string
  residentId: string
  amount: number
  paymentDate: string
  method?: PaymentMethod
  referenceNumber?: string
  remarks?: string
  status?: PaymentStatus
}

export interface UpdatePaymentInput {
  paymentNumber?: string
  assessmentId?: string
  residentId?: string
  amount?: number
  paymentDate?: string
  method?: PaymentMethod
  referenceNumber?: string
  remarks?: string
  status?: PaymentStatus
}

export interface ResidentOption {
  id: string
  householdId: string | null
  firstName: string
  middleName: string | null
  lastName: string
  suffix: string | null
}

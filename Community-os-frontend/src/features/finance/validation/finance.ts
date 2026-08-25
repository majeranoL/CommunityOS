import { z } from 'zod'

export const assessmentSchema = z.object({
  assessmentNumber: z.string().min(1, 'Assessment number is required').max(30),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().or(z.literal('')),
  householdId: z.string().min(1, 'Select a household'),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
  period: z.string().max(20).optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
  chargeTypeId: z.string().optional().or(z.literal('')),
  billingPeriodId: z.string().optional().or(z.literal('')),
})

export type AssessmentFormValues = z.infer<typeof assessmentSchema>

export const generateAssessmentsSchema = z
  .object({
    title: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
    period: z.string().max(20).optional().or(z.literal('')),
    amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0').optional(),
    dueDate: z.string().min(1, 'Due date is required'),
    remarks: z.string().optional().or(z.literal('')),
    householdIds: z.array(z.string()).optional(),
    chargeTypeId: z.string().optional().or(z.literal('')),
    billingPeriodId: z.string().optional().or(z.literal('')),
  })
  .refine((value) => value.chargeTypeId || value.title, {
    message: 'Choose a charge type or provide a title',
    path: ['chargeTypeId'],
  })

export type GenerateAssessmentsFormValues = z.infer<typeof generateAssessmentsSchema>

export const paymentAllocationSchema = z.object({
  assessmentId: z.string().min(1, 'Select an assessment'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
})

export const paymentSchema = z.object({
  paymentNumber: z.string().min(1, 'Payment number is required').max(30),
  residentId: z.string().min(1, 'Select a resident'),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string().min(1, 'Select a method'),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
  chargeTypeId: z.string().optional().or(z.literal('')),
  assessmentId: z.string().optional().or(z.literal('')),
  billingPeriodIds: z.array(z.string()).optional(),
  allocations: z.array(paymentAllocationSchema).optional(),
  proofFileId: z.string().optional().or(z.literal('')),
  proofUrl: z.string().optional().or(z.literal('')),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

export const rejectPaymentSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
})

export type RejectPaymentFormValues = z.infer<typeof rejectPaymentSchema>

export const chargeTypeSchema = z.object({
  code: z.string().min(2, 'Code is required').max(30),
  name: z.string().min(2, 'Name is required').max(100),
  category: z.string().min(1, 'Select a category'),
  recurrence: z.string().min(1, 'Select a recurrence'),
  amount: z.number({ error: 'Enter an amount' }).min(0, 'Amount must not be negative').optional(),
  dueDay: z.number({ error: 'Enter a day' }).min(1, 'Day must be between 1 and 31').max(31).optional().nullable(),
  description: z.string().max(500).optional().or(z.literal('')),
  allowAdvancePayment: z.boolean().optional(),
  advanceAppliesToOneTime: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int('Must be a whole number').optional(),
})

export type ChargeTypeFormValues = z.infer<typeof chargeTypeSchema>

export const billingPeriodSchema = z.object({
  chargeTypeId: z.string().min(1, 'Select a charge type'),
  periodKey: z
    .string()
    .min(1, 'Period (YYYY-MM) is required')
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM format, e.g. 2026-09'),
  label: z.string().max(100).optional().or(z.literal('')),
  dueDate: z.string().optional().or(z.literal('')),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0').optional(),
})

export type BillingPeriodFormValues = z.infer<typeof billingPeriodSchema>

export const generateBillingPeriodsSchema = z.object({
  chargeTypeId: z.string().min(1, 'Select a charge type'),
  periodKey: z
    .string()
    .min(1, 'Period (YYYY-MM) is required')
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM format, e.g. 2026-09'),
  months: z.number({ error: 'Enter months' }).int('Must be a whole number').min(1, 'At least 1 month').max(36, 'At most 36 months'),
  dueDate: z.string().optional().or(z.literal('')),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0').optional(),
})

export type GenerateBillingPeriodsFormValues = z.infer<typeof generateBillingPeriodsSchema>

export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'GCASH',
  'CREDIT_CARD',
  'CHEQUE',
  'OTHER',
] as const

export const FINANCE_CATEGORIES = [
  'DUES',
  'SPECIAL_ASSESSMENT',
  'BOND',
  'FACILITY_FEE',
  'VEHICLE_STICKER',
  'PARKING_FEE',
  'UTILITY',
  'MEMBERSHIP_FEE',
  'LATE_PENALTY',
  'VIOLATION_FINE',
  'OTHER',
] as const

export const CHARGE_RECURRENCES = ['RECURRING', 'ONE_TIME'] as const

export const ASSESSMENT_STATUSES = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'WAIVED',
  'CANCELLED',
] as const

export const PAYMENT_STATUSES = [
  'PENDING_VERIFICATION',
  'VERIFIED',
  'REJECTED',
  'REFUNDED',
  'CANCELLED',
] as const

export const BILLING_PERIOD_STATUSES = ['OPEN', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED'] as const

export const EXPENSE_CATEGORIES = [
  'UTILITIES',
  'MAINTENANCE',
  'SALARIES',
  'SUPPLIES',
  'EVENTS',
  'SECURITY',
  'TAXES',
  'INSURANCE',
  'TRANSPORTATION',
  'OTHER',
] as const

export const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  category: z.enum(EXPENSE_CATEGORIES, { error: 'Select a category' }),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: 'Select a method' }),
  payee: z.string().max(200).optional().or(z.literal('')),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  receiptFileId: z.string().optional().or(z.literal('')),
  receiptUrl: z.string().optional().or(z.literal('')),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

// ==============================================
// Utility Expenses
// ==============================================

export const UTILITY_TYPES = [
  'ELECTRICITY',
  'WATER',
  'GARBAGE',
  'SEWERAGE',
  'INTERNET',
  'OTHER',
] as const

export const utilityExpenseSchema = z.object({
  providerName: z.string().min(1, 'Provider name is required').max(100),
  utilityType: z.enum(UTILITY_TYPES, { error: 'Select a utility type' }),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0'),
  expenseDate: z.string().min(1, 'Date is required'),
  billingPeriod: z.string().max(50).optional().or(z.literal('')),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: 'Select a method' }),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  invoiceNumber: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  receiptFileId: z.string().optional().or(z.literal('')),
  receiptUrl: z.string().optional().or(z.literal('')),
})

export type UtilityExpenseFormValues = z.infer<typeof utilityExpenseSchema>

export function toNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function periodKeyOf(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

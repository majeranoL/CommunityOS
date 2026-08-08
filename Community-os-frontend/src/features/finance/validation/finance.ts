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
})

export type AssessmentFormValues = z.infer<typeof assessmentSchema>

export const paymentSchema = z.object({
  paymentNumber: z.string().min(1, 'Payment number is required').max(30),
  assessmentId: z.string().min(1, 'Select an assessment'),
  residentId: z.string().min(1, 'Select a resident'),
  amount: z.number({ error: 'Enter an amount' }).min(0.01, 'Amount must be greater than 0'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string().min(1, 'Select a method'),
  referenceNumber: z.string().max(100).optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
})

export type PaymentFormValues = z.infer<typeof paymentSchema>

export const PAYMENT_METHODS = [
  'CASH',
  'BANK_TRANSFER',
  'GCASH',
  'CREDIT_CARD',
  'CHEQUE',
  'OTHER',
] as const

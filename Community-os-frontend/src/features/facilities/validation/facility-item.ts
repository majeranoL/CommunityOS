import { z } from 'zod'
import { facilityItemCategories } from '@/features/facilities/types/facility-item'

export const facilityItemSchema = z
  .object({
    name: z.string().min(1, 'Name is required.').max(100),
    category: z.string().optional().or(z.literal('')),
    description: z.string().max(1000).optional().or(z.literal('')),
    quantityTotal: z
      .string()
      .min(1, 'Quantity is required.')
      .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
        message: 'Enter a whole number.',
      }),
    chargesFee: z.boolean(),
    borrowFee: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (value) => !value || value === '' || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0),
        { message: 'Enter a valid amount.' },
      ),
    isActive: z.boolean(),
  })
  .refine((values) => !values.chargesFee || Boolean(values.borrowFee), {
    message: 'Fee amount is required.',
    path: ['borrowFee'],
  })

export type FacilityItemFormValues = z.infer<typeof facilityItemSchema>

export const borrowItemSchema = z
  .object({
    quantity: z
      .string()
      .min(1, 'Quantity is required.')
      .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, {
        message: 'At least one unit is required.',
      }),
    purpose: z.string().max(300).optional().or(z.literal('')),
    neededFrom: z.string().min(1, 'Pickup date is required.'),
    neededUntil: z.string().min(1, 'Return date is required.'),
  })
  .refine(
    (values) =>
      !values.neededFrom ||
      !values.neededUntil ||
      new Date(values.neededUntil) >= new Date(values.neededFrom),
    {
      message: 'Return date must be on or after the pickup date.',
      path: ['neededUntil'],
    },
  )

export type BorrowItemFormValues = z.infer<typeof borrowItemSchema>

export { facilityItemCategories }

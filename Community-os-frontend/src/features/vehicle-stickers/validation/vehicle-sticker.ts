import { z } from 'zod'

const quantityField = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100),
    { message: 'Must be a whole number between 1 and 100.' },
  )
  .optional()
  .or(z.literal(''))

const stickerNumberField = z
  .string()
  .trim()
  .max(30, 'Max 30 characters')
  .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers, and dashes only')
  .optional()
  .or(z.literal(''))

export const stickerFormSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  stickerNumber: z.string().trim().max(30).optional().or(z.literal('')),
  issueDate: z.string().optional().or(z.literal('')),
  expirationDate: z.string().optional().or(z.literal('')),
  quantity: quantityField,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  photoUrl: z.string().trim().max(500).optional().or(z.literal('')),
})

export type StickerFormValues = z.infer<typeof stickerFormSchema>

export const stickerRequestSchema = z.object({
  quantity: quantityField,
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  stickerNumber: stickerNumberField,
})

export type StickerRequestValues = z.infer<typeof stickerRequestSchema>

export const stickerVerifySchema = z.object({
  approved: z.boolean(),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
  stickerNumber: stickerNumberField,
})

export type StickerVerifyValues = z.infer<typeof stickerVerifySchema>

export const stickerRenewSchema = z.object({
  expirationDate: z.string().min(1, 'New expiration date is required'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type StickerRenewValues = z.infer<typeof stickerRenewSchema>

const monthDay = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

const priceField = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === '' || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) >= 0),
    { message: 'Enter a valid amount (e.g. 250 or 250.00).' },
  )
  .optional()
  .or(z.literal(''))

export const stickerSettingsSchema = z
  .object({
    cycleEnabled: z.boolean(),
    cycleStart: z
      .string()
      .regex(monthDay, 'Use MM-DD (e.g. 07-15)')
      .optional()
      .or(z.literal('')),
    cycleEnd: z.string().regex(monthDay, 'Use MM-DD (e.g. 07-14)').optional().or(z.literal('')),
    maxQuantity: quantityField,
    price: priceField,
  })
  .refine(
    (values) => !values.cycleEnabled || (values.cycleStart && values.cycleEnd),
    { message: 'Set both cycle start and end dates when the cycle is enabled.' },
  )

export type StickerSettingsValues = z.infer<typeof stickerSettingsSchema>
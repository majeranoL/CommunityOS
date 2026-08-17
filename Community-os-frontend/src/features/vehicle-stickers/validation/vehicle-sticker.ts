import { z } from 'zod'

export const stickerFormSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  stickerNumber: z.string().trim().min(1, 'Sticker number is required').max(30),
  issueDate: z.string().min(1, 'Issue date is required'),
  expirationDate: z.string().min(1, 'Expiration date is required'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  photoUrl: z.string().trim().max(500).optional().or(z.literal('')),
})

export type StickerFormValues = z.infer<typeof stickerFormSchema>

export const stickerVerifySchema = z.object({
  approved: z.boolean(),
  remarks: z.string().trim().max(500).optional().or(z.literal('')),
})

export type StickerVerifyValues = z.infer<typeof stickerVerifySchema>

export const stickerRenewSchema = z.object({
  expirationDate: z.string().min(1, 'New expiration date is required'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

export type StickerRenewValues = z.infer<typeof stickerRenewSchema>

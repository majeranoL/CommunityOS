import { z } from 'zod'

export const vehicleFormSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .min(1, 'Plate number is required')
    .max(20)
    .transform((value) => value.toUpperCase()),
  make: z.string().trim().max(50).optional().or(z.literal('')),
  model: z.string().trim().max(50).optional().or(z.literal('')),
  color: z.string().trim().max(30).optional().or(z.literal('')),
  type: z.string().optional().or(z.literal('')),
  residentId: z.string().optional().or(z.literal('')),
  parkingStickerNumber: z.string().trim().max(30).optional().or(z.literal('')),
  photoUrl: z.string().optional().or(z.literal('')),
})

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>

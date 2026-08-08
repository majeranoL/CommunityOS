import { z } from 'zod'

export const householdFormSchema = z
  .object({
    block: z.string().trim().max(20).optional().or(z.literal('')),
    lot: z.string().trim().max(20).optional().or(z.literal('')),
    unit: z.string().trim().max(20).optional().or(z.literal('')),
    address: z.string().trim().max(255).optional().or(z.literal('')),
  })
  .refine((values) => Boolean(values.block || values.lot || values.unit || values.address), {
    message: 'Provide at least one of block, lot, unit, or address',
    path: ['block'],
  })

export type HouseholdFormValues = z.infer<typeof householdFormSchema>

import { z } from 'zod'

export const createRenterSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  phoneNumber: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().or(z.literal('')),
})

export type CreateRenterFormValues = z.infer<typeof createRenterSchema>

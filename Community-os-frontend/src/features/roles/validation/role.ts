import { z } from 'zod'

export const roleFormSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().max(200).optional().or(z.literal('')),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

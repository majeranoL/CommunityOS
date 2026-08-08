import { z } from 'zod'

export const documentFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
})

export type DocumentFormValues = z.infer<typeof documentFormSchema>

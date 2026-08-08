import { z } from 'zod'

export const messageFormSchema = z.object({
  recipientId: z.string().optional().or(z.literal('')),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().min(1, 'Message is required'),
})

export type MessageFormValues = z.infer<typeof messageFormSchema>

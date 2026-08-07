import { z } from 'zod'

export const pollSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional().or(z.literal('')),
    options: z
      .array(z.object({ value: z.string() }))
      .min(2, 'Add at least 2 options')
      .max(20, 'You can have at most 20 options'),
    isAnonymous: z.boolean(),
    allowMultiple: z.boolean(),
    allowAddOptions: z.boolean(),
    endAt: z.string().optional().or(z.literal('')),
    publish: z.boolean(),
  })
  .refine((values) => values.options.filter((option) => option.value.trim()).length >= 2, {
    message: 'Provide at least 2 non-empty options.',
    path: ['options'],
  })
  .refine((values) => values.options.filter((option) => option.value.trim()).length <= 20, {
    message: 'You can have at most 20 options.',
    path: ['options'],
  })

export type PollFormValues = z.infer<typeof pollSchema>

import { z } from 'zod'

export const petFormSchema = z.object({
  name: z.string().trim().min(1, 'Pet name is required').max(100),
  species: z.string().optional().or(z.literal('')),
  breed: z.string().trim().max(50).optional().or(z.literal('')),
  sex: z.string().trim().max(20).optional().or(z.literal('')),
  color: z.string().trim().max(30).optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  registrationNumber: z.string().trim().max(50).optional().or(z.literal('')),
  microchipNumber: z.string().trim().max(50).optional().or(z.literal('')),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
  residentId: z.string().optional().or(z.literal('')),
  photoUrl: z.string().optional().or(z.literal('')),
  vaccinationCertificateUrl: z.string().optional().or(z.literal('')),
  rabiesCertificateUrl: z.string().optional().or(z.literal('')),
  veterinaryCertificateUrl: z.string().optional().or(z.literal('')),
})

export type PetFormValues = z.infer<typeof petFormSchema>

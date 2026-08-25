import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { FileUpload } from '@/components/shared/file-upload'
import { useCreatePet, useUpdatePet } from '@/features/pets/hooks/use-pets'
import { petFormSchema, type PetFormValues } from '@/features/pets/validation/pet'
import type { PetListItem, PetSpecies } from '@/features/pets/types/pet'

interface PetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pet?: PetListItem | null
  selfService?: boolean
}

const PET_SPECIES: PetSpecies[] = ['DOG', 'CAT', 'BIRD', 'FISH', 'REPTILE', 'SMALL_ANIMAL', 'OTHER']

function toFormValues(pet?: PetListItem | null): PetFormValues {
  return {
    name: pet?.name ?? '',
    species: pet?.species ?? '',
    breed: pet?.breed ?? '',
    sex: pet?.sex ?? '',
    color: pet?.color ?? '',
    birthDate: pet?.birthDate ? pet.birthDate.slice(0, 10) : '',
    registrationNumber: pet?.registrationNumber ?? '',
    microchipNumber: pet?.microchipNumber ?? '',
    remarks: pet?.remarks ?? '',
    residentId: pet?.residentId ?? '',
    photoUrl: pet?.photoUrl ?? '',
    vaccinationCertificateUrl: pet?.vaccinationCertificateUrl ?? '',
    rabiesCertificateUrl: pet?.rabiesCertificateUrl ?? '',
    veterinaryCertificateUrl: pet?.veterinaryCertificateUrl ?? '',
  }
}

export function PetFormDialog({
  open,
  onOpenChange,
  pet,
  selfService = false,
}: PetFormDialogProps) {
  const isEditing = Boolean(pet)
  const createPet = useCreatePet(() => onOpenChange(false))
  const updatePet = useUpdatePet(() => onOpenChange(false))

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(pet))
  }, [open, pet, form])

  const handleSubmit = (values: PetFormValues) => {
    const input = {
      name: values.name,
      species: (values.species || undefined) as PetSpecies | undefined,
      breed: values.breed || undefined,
      sex: values.sex || undefined,
      color: values.color || undefined,
      birthDate: values.birthDate || undefined,
      registrationNumber: values.registrationNumber || undefined,
      microchipNumber: values.microchipNumber || undefined,
      remarks: values.remarks || undefined,
      residentId: values.residentId || undefined,
      photoUrl: values.photoUrl || undefined,
      vaccinationCertificateUrl: values.vaccinationCertificateUrl || undefined,
      rabiesCertificateUrl: values.rabiesCertificateUrl || undefined,
      veterinaryCertificateUrl: values.veterinaryCertificateUrl || undefined,
    }

    if (isEditing && pet) {
      updatePet.mutate({ id: pet.id, input })
    } else {
      createPet.mutate(input)
    }
  }

  const pending = createPet.isPending || updatePet.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit pet' : 'Register pet'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this pet.'
              : 'Register a pet in your household.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pet name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Max" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="species"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Species</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {PET_SPECIES.map((species) => (
                            <SelectItem key={species} value={species}>
                              {species.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="breed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Breed</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sex</FormLabel>
                    <FormControl>
                      <Input placeholder="M / F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birth date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration no.</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="microchipNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Microchip no.</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selfService ? (
              <p className="text-sm text-muted-foreground">
                This pet will be registered under your household.
              </p>
            ) : (
              <FormField
                control={form.control}
                name="residentId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Caretaker</FormLabel>
                    <FormControl>
                      <ResidentSelect value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo</FormLabel>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        maxFiles={1}
                        accept="image/*"
                        label="Upload pet photo"
                        description="PNG, JPG, or WEBP"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vaccinationCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vaccination certificate</FormLabel>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        maxFiles={1}
                        accept="image/*,application/pdf"
                        label="Upload certificate"
                        description="Image or PDF"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rabiesCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rabies certificate</FormLabel>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        maxFiles={1}
                        accept="image/*,application/pdf"
                        label="Upload certificate"
                        description="Image or PDF"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="veterinaryCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Veterinary certificate</FormLabel>
                    <FormControl>
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        maxFiles={1}
                        accept="image/*,application/pdf"
                        label="Upload certificate"
                        description="Image or PDF"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes…" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Register pet'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

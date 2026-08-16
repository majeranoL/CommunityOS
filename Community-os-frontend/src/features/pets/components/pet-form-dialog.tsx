import { useEffect, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload } from 'lucide-react'
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
import { toast } from '@/components/ui/sonner'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { documentsService } from '@/features/documents/services/documents'
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

function FileUploadField({
  label,
  value,
  onChange,
  accept,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  accept: string
}) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await documentsService.upload(file)
      onChange(result.url)
    } catch {
      toast.error('Upload failed. Try again.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const fileName = value ? value.split('/').pop() : null

  return (
    <>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <div className="space-y-1.5">
          <Input
            type="file"
            accept={accept}
            onChange={handleFile}
            disabled={uploading}
            className="h-9 py-0"
          />
          {uploading ? (
            <p className="text-xs text-muted-foreground">Uploading…</p>
          ) : fileName ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Upload className="h-3 w-3" />
              {fileName}
            </p>
          ) : null}
        </div>
      </FormControl>
      <FormMessage />
    </>
  )
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
                    <FileUploadField
                      label="Photo"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      accept="image/*"
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vaccinationCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FileUploadField
                      label="Vaccination certificate"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      accept="image/*,.pdf"
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rabiesCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FileUploadField
                      label="Rabies certificate"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      accept="image/*,.pdf"
                    />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="veterinaryCertificateUrl"
                render={({ field }) => (
                  <FormItem>
                    <FileUploadField
                      label="Veterinary certificate"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      accept="image/*,.pdf"
                    />
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

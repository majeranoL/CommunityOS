import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateFacility, useUpdateFacility } from '@/features/facilities/hooks/use-facilities'
import {
  facilitySchema,
  facilityStatuses,
  facilityTypes,
  type FacilityFormValues,
} from '@/features/facilities/validation/facility'
import type { Facility } from '@/features/facilities/types/facility'

interface FacilityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  facility?: Facility | null
}

function toNumber(value: string | undefined) {
  if (!value || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function FacilityFormDialog({ open, onOpenChange, facility }: FacilityFormDialogProps) {
  const isEdit = Boolean(facility)
  const createFacility = useCreateFacility()
  const updateFacility = useUpdateFacility()

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: '',
      type: '',
      description: '',
      location: '',
      capacity: '',
      imageUrl: '',
      hourlyRate: '',
      status: 'AVAILABLE',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: facility?.name ?? '',
        type: facility?.type ?? '',
        description: facility?.description ?? '',
        location: facility?.location ?? '',
        capacity: facility?.capacity != null ? String(facility.capacity) : '',
        imageUrl: facility?.imageUrl ?? '',
        hourlyRate: facility?.hourlyRate != null ? String(facility.hourlyRate) : '',
        status: facility?.status ?? 'AVAILABLE',
      })
    }
  }, [open, facility, form])

  const handleSubmit = (values: FacilityFormValues) => {
    const input = {
      name: values.name,
      type: values.type,
      description: values.description || undefined,
      location: values.location || undefined,
      capacity: toNumber(values.capacity),
      imageUrl: values.imageUrl || undefined,
      hourlyRate: toNumber(values.hourlyRate),
      status: values.status,
    }

    if (isEdit && facility) {
      updateFacility.mutate(
        { id: facility.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createFacility.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit facility' : 'New facility'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the details of this facility.' : 'Add a bookable amenity for your community.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Clubhouse" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {facilityTypes.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {facilityStatuses.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional details…" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Block 3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="e.g. 50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly rate</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" placeholder="e.g. 50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://… (optional)" {...field} />
                  </FormControl>
                  <FormDescription>A photo makes the facility easier to recognize.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFacility.isPending || updateFacility.isPending}>
                {isEdit ? 'Save changes' : 'Create facility'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

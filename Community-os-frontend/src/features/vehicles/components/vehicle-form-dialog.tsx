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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { FileUpload } from '@/components/shared/file-upload'
import { useCreateVehicle, useUpdateVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { vehicleFormSchema, type VehicleFormValues } from '@/features/vehicles/validation/vehicle'
import type { VehicleListItem } from '@/features/vehicles/types/vehicle'
import type { VehicleType } from '@/features/vehicles/types/vehicle'

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: VehicleListItem | null
  selfService?: boolean
}

const VEHICLE_TYPES: VehicleType[] = ['CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'BICYCLE', 'OTHER']

function toFormValues(vehicle?: VehicleListItem | null): VehicleFormValues {
  return {
    plateNumber: vehicle?.plateNumber ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    color: vehicle?.color ?? '',
    type: vehicle?.type ?? '',
    residentId: vehicle?.residentId ?? '',
    parkingStickerNumber: vehicle?.parkingStickerNumber ?? '',
    photoUrl: vehicle?.photoUrl ?? '',
  }
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  selfService = false,
}: VehicleFormDialogProps) {
  const isEditing = Boolean(vehicle)
  const createVehicle = useCreateVehicle(() => onOpenChange(false))
  const updateVehicle = useUpdateVehicle(() => onOpenChange(false))

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(vehicle))
  }, [open, vehicle, form])

  const handleSubmit = (values: VehicleFormValues) => {
    const input = {
      plateNumber: values.plateNumber,
      make: values.make || undefined,
      model: values.model || undefined,
      color: values.color || undefined,
      type: (values.type || undefined) as VehicleType | undefined,
      residentId: values.residentId || undefined,
      parkingStickerNumber: values.parkingStickerNumber || undefined,
      photoUrl: values.photoUrl || undefined,
    }

    if (isEditing && vehicle) {
      updateVehicle.mutate({ id: vehicle.id, input })
    } else {
      createVehicle.mutate(input)
    }
  }

  const pending = createVehicle.isPending || updateVehicle.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit vehicle' : 'Add vehicle'}</DialogTitle>
          <DialogDescription>
            Register a vehicle owned by a resident.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ABC 1234"
                      className="uppercase"
                      onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="Toyota" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="Vios" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0) + type.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Input placeholder="White" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {selfService ? (
              <p className="text-sm text-muted-foreground">
                This vehicle will be registered under your resident profile.
              </p>
            ) : (
              <FormField
                control={form.control}
                name="residentId"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <ResidentSelect value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="parkingStickerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parking sticker</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle photo</FormLabel>
                  <FormControl>
                    <FileUpload
                      value={field.value}
                      onChange={field.onChange}
                      maxFiles={1}
                      accept="image/*"
                      label="Upload vehicle photo"
                      description="PNG, JPG, or WEBP up to 10MB"
                    />
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
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Add vehicle'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

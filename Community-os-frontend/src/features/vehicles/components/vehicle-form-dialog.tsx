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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FileUpload } from '@/components/shared/file-upload'
import { useCreateVehicle, useUpdateVehicle } from '@/features/vehicles/hooks/use-vehicles'
import { vehicleFormSchema, type VehicleFormValues } from '@/features/vehicles/validation/vehicle'
import type { VehicleListItem } from '@/features/vehicles/types/vehicle'
import type { VehicleType } from '@/features/vehicles/types/vehicle'

interface VehicleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: VehicleListItem | null
}

const VEHICLE_TYPES: VehicleType[] = ['CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'BICYCLE', 'OTHER']

function toFormValues(vehicle?: VehicleListItem | null): VehicleFormValues {
  return {
    plateNumber: vehicle?.plateNumber ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    color: vehicle?.color ?? '',
    type: vehicle?.type ?? '',
    hasSticker: vehicle?.hasSticker ?? Boolean(vehicle?.parkingStickerNumber),
    parkingStickerNumber: vehicle?.parkingStickerNumber ?? '',
    photoUrl: vehicle?.photoUrl ?? '',
  }
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
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

  const hasSticker = form.watch('hasSticker')

  const handleSubmit = (values: VehicleFormValues) => {
    const input = {
      plateNumber: values.plateNumber,
      make: values.make || undefined,
      model: values.model || undefined,
      color: values.color || undefined,
      type: (values.type || undefined) as VehicleType | undefined,
      hasSticker: values.hasSticker,
      parkingStickerNumber:
        values.hasSticker && values.parkingStickerNumber
          ? values.parkingStickerNumber
          : undefined,
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
            Register a vehicle under your resident profile.
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
            <p className="text-sm text-muted-foreground">
              This vehicle will be registered under your resident profile.
            </p>
            <FormField
              control={form.control}
              name="hasSticker"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Does this vehicle have a sticker?</FormLabel>
                    <FormDescription>
                      Sticker numbers are first come, first served.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {hasSticker ? (
              <FormField
                control={form.control}
                name="parkingStickerNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sticker number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. STK-0001"
                        className="uppercase"
                        onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional. Leave blank if you have not received it yet.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
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

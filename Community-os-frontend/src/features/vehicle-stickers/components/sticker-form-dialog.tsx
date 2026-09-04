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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateSticker, useUpdateSticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { stickerFormSchema, type StickerFormValues } from '@/features/vehicle-stickers/validation/vehicle-sticker'
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles'
import type { VehicleStickerListItem } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { useAuthStore, useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'

interface StickerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sticker?: VehicleStickerListItem | null
  vehicleId?: string
}

function toFormValues(sticker?: VehicleStickerListItem | null, vehicleId?: string): StickerFormValues {
  return {
    vehicleId: sticker?.vehicle?.id ?? vehicleId ?? '',
    stickerNumber: sticker?.stickerNumber ?? '',
    issueDate: sticker?.issueDate ? sticker.issueDate.split('T')[0] : '',
    expirationDate: sticker?.expirationDate ? sticker.expirationDate.split('T')[0] : '',
    notes: sticker?.notes ?? '',
    photoUrl: sticker?.photoUrl ?? '',
  }
}

export function StickerFormDialog({
  open,
  onOpenChange,
  sticker,
  vehicleId,
}: StickerFormDialogProps) {
  const isEditing = Boolean(sticker)
  const createSticker = useCreateSticker(() => onOpenChange(false))
  const updateSticker = useUpdateSticker(() => onOpenChange(false))

  const user = useAuthStore((state) => state.user)
  const myResidentId = user?.resident?.id
  const isOfficer = useHasPermission(PERMISSIONS.stickerVerify)

  const { data: vehicles } = useVehicles({
    page: 1,
    limit: 100,
    residentId: isOfficer ? undefined : myResidentId || undefined,
    status: 'ACTIVE',
  })

  const form = useForm<StickerFormValues>({
    resolver: zodResolver(stickerFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(sticker, vehicleId))
  }, [open, sticker, vehicleId, form])

  const handleSubmit = (values: StickerFormValues) => {
    const input = {
      vehicleId: values.vehicleId,
      stickerNumber: values.stickerNumber,
      issueDate: values.issueDate,
      expirationDate: values.expirationDate,
      notes: values.notes || undefined,
      photoUrl: values.photoUrl || undefined,
    }

    if (isEditing && sticker) {
      updateSticker.mutate({ id: sticker.id, input })
    } else {
      createSticker.mutate(input)
    }
  }

  const pending = createSticker.isPending || updateSticker.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit sticker' : 'Apply for sticker'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the vehicle sticker details.'
              : 'Submit a new vehicle sticker application.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!vehicleId && !sticker && (
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles?.items?.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.plateNumber}
                            {vehicle.make ? ` · ${vehicle.make}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="stickerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sticker number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., STK-2026-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes" {...field} />
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
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Submit application'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
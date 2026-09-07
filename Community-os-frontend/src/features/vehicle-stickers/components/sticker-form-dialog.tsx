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
import { useCreateSticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { stickerFormSchema, type StickerFormValues } from '@/features/vehicle-stickers/validation/vehicle-sticker'
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles'
import { formatCurrency } from '@/lib/format'

interface StickerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicleId?: string
  price?: number
}

export function StickerFormDialog({ open, onOpenChange, vehicleId, price = 0 }: StickerFormDialogProps) {
  const createSticker = useCreateSticker(() => onOpenChange(false))

  const { data: vehicles } = useVehicles({
    page: 1,
    limit: 100,
    status: 'ACTIVE',
  })

  const form = useForm<StickerFormValues>({
    resolver: zodResolver(stickerFormSchema),
    defaultValues: { vehicleId: vehicleId ?? '', quantity: '', notes: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ vehicleId: vehicleId ?? '', quantity: '', notes: '' })
    }
  }, [open, vehicleId, form])

  const watchQuantity = form.watch('quantity')
  const quantity = Math.max(1, Number(watchQuantity) || 1)
  const totalFee = price > 0 ? price * quantity : 0

  const handleSubmit = (values: StickerFormValues) => {
    const input = {
      vehicleId: values.vehicleId,
      quantity: values.quantity ? Number(values.quantity) : 1,
      stickerNumber: values.stickerNumber?.trim() || undefined,
      issueDate: values.issueDate || undefined,
      expirationDate: values.expirationDate || undefined,
      notes: values.notes || undefined,
      photoUrl: values.photoUrl || undefined,
    }
    createSticker.mutate(input)
  }

  const pending = createSticker.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue sticker</DialogTitle>
          <DialogDescription>
            Issue a vehicle sticker directly. Number{quantity > 1 ? 's are' : ' is'} generated
            automatically {quantity > 1 ? 'for each sticker' : 'unless you provide one'}.
          </DialogDescription>
        </DialogHeader>

        {totalFee > 0 ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Household will be billed</span>
              <span className="font-medium">
                {formatCurrency(totalFee)}
                {quantity > 1 ? ` (×${quantity})` : ''}
              </span>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!vehicleId && (
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
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="1"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {quantity === 1 ? (
              <FormField
                control={form.control}
                name="stickerNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sticker number (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Auto-generated if blank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue date (optional)</FormLabel>
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
                    <FormLabel>Expiration date (optional)</FormLabel>
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
                {pending ? 'Saving…' : 'Issue sticker'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
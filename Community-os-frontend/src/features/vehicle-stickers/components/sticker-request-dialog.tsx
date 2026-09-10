import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { useRequestSticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import type { VehicleListItem } from '@/features/vehicles/types/vehicle'
import type { StickerOptions } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { formatCurrency, formatDate } from '@/lib/format'

interface StickerRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: VehicleListItem
  price?: number
  options?: StickerOptions | null
}

const requestSchema = z.object({
  quantity: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100),
      { message: 'Must be a whole number between 1 and 100.' },
    )
    .optional()
    .or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  stickerNumber: z
    .string()
    .trim()
    .max(30, 'Max 30 characters')
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers, and dashes only')
    .optional()
    .or(z.literal('')),
})

type RequestFormValues = z.infer<typeof requestSchema>

export function StickerRequestDialog({
  open,
  onOpenChange,
  vehicle,
  price = 0,
  options,
}: StickerRequestDialogProps) {
  const requestSticker = useRequestSticker(() => onOpenChange(false))
  const maxQuantity = options?.maxQuantity ?? 1
  const cycle = options?.cycle

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { quantity: '', notes: '', stickerNumber: '' },
  })

  useEffect(() => {
    if (open) {
      form.reset({ quantity: '', notes: '', stickerNumber: '' })
    }
  }, [open, form, maxQuantity])

  const watchQuantity = form.watch('quantity')
  const quantity = Math.max(1, Number(watchQuantity) || 1)
  const totalFee = price > 0 ? price * quantity : 0

  const handleSubmit = (values: RequestFormValues) => {
    requestSticker.mutate({
      vehicleId: vehicle.id,
      quantity: values.quantity ? Number(values.quantity) : 1,
      notes: values.notes || undefined,
      stickerNumber: values.stickerNumber || undefined,
    })
  }

  const validityLabel =
    cycle?.enabled && cycle.activeExpiration
      ? `Until ${formatDate(cycle.activeExpiration)}`
      : `${(options?.validityDays ?? 365) / 365} year`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request sticker</DialogTitle>
          <DialogDescription>
            Request a vehicle sticker for{' '}
            <span className="font-mono text-foreground">{vehicle.plateNumber}</span>. An officer
            will review your request and the fee will be billed to your household.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicle</span>
            <span className="font-medium uppercase">{vehicle.plateNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sticker fee</span>
            <span className="font-medium">
              {price > 0 ? formatCurrency(totalFee) : 'Free'}
              {quantity > 1 ? ` (×${quantity})` : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Validity</span>
            <span className="font-medium">{validityLabel}</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {maxQuantity >= 2 ? (
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity (max {maxQuantity})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={maxQuantity}
                        placeholder="1"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
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
            <FormField
              control={form.control}
              name="stickerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred sticker number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. STK-000123 (optional)" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to be assigned automatically. Your preferred
                    number is used at approval if it is still available.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestSticker.isPending}>
                {requestSticker.isPending ? 'Submitting…' : 'Request sticker'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
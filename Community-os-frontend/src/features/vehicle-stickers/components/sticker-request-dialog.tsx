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
import { formatCurrency } from '@/lib/format'

interface StickerRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: VehicleListItem
  price: number
}

const requestSchema = z.object({
  notes: z.string().trim().max(500).optional().or(z.literal('')),
})

type RequestFormValues = z.infer<typeof requestSchema>

export function StickerRequestDialog({
  open,
  onOpenChange,
  vehicle,
  price,
}: StickerRequestDialogProps) {
  const requestSticker = useRequestSticker(() => onOpenChange(false))

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { notes: '' },
  })

  useEffect(() => {
    if (open) form.reset({ notes: '' })
  }, [open, form])

  const handleSubmit = (values: RequestFormValues) => {
    requestSticker.mutate({
      vehicleId: vehicle.id,
      notes: values.notes || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy sticker</DialogTitle>
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
            <span className="font-medium">{price > 0 ? formatCurrency(price) : 'Free'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Validity</span>
            <span className="font-medium">1 year</span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

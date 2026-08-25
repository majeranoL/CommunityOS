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
import { useBorrowItem } from '@/features/facilities/hooks/use-facility-items'
import { borrowItemSchema, type BorrowItemFormValues } from '@/features/facilities/validation/facility-item'
import type { FacilityItem } from '@/features/facilities/types/facility-item'

interface BorrowItemDialogProps {
  item: FacilityItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BorrowItemDialog({ item, open, onOpenChange }: BorrowItemDialogProps) {
  const borrow = useBorrowItem()

  const form = useForm<BorrowItemFormValues>({
    resolver: zodResolver(borrowItemSchema),
    defaultValues: { quantity: '1', purpose: '', neededFrom: '', neededUntil: '' },
  })

  useEffect(() => {
    if (open) form.reset({ quantity: '1', purpose: '', neededFrom: '', neededUntil: '' })
  }, [open, item, form])

  const quantity = Number(form.watch('quantity')) || 0

  if (!item) return null

  const feePerUnit = item.borrowFee != null ? Number(item.borrowFee) : null
  const totalFee = feePerUnit != null ? feePerUnit * quantity : null

  const handleSubmit = (values: BorrowItemFormValues) => {
    borrow.mutate(
      {
        itemId: item.id,
        input: {
          quantity: Number(values.quantity),
          purpose: values.purpose || undefined,
          neededFrom: values.neededFrom,
          neededUntil: values.neededUntil,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Borrow “{item.name}”</DialogTitle>
          <DialogDescription>
            {item.quantityAvailable} of {item.quantityTotal} unit(s) currently available.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={item.quantityAvailable} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="neededFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="neededUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Return date</FormLabel>
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
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purpose</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="e.g. Birthday party" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {feePerUnit != null && feePerUnit > 0 ? (
              <p className="rounded-lg border p-3 text-sm">
                Fee: ₱{feePerUnit.toLocaleString('en-PH')} per unit × {quantity} ={' '}
                <span className="font-medium">₱{(totalFee ?? 0).toLocaleString('en-PH')}</span>
                <span className="block text-xs text-muted-foreground">
                  Charged to your household account once approved.
                </span>
              </p>
            ) : (
              <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                This item is free to borrow.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={borrow.isPending}>
                {borrow.isPending ? 'Submitting…' : 'Submit request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

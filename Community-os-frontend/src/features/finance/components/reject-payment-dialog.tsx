import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { useRejectPayment } from '@/features/finance/hooks/use-finance'
import { rejectPaymentSchema, type RejectPaymentFormValues } from '@/features/finance/validation/finance'
import type { PaymentListItem } from '@/features/finance/types/finance'

interface RejectPaymentDialogProps {
  payment: PaymentListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RejectPaymentDialog({ payment, open, onOpenChange }: RejectPaymentDialogProps) {
  const reject = useRejectPayment()

  const form = useForm<RejectPaymentFormValues>({
    resolver: zodResolver(rejectPaymentSchema),
    defaultValues: { reason: '' },
  })

  useEffect(() => {
    if (open) form.reset({ reason: '' })
  }, [open, form])

  const handleSubmit = (values: RejectPaymentFormValues) => {
    if (!payment) return
    reject.mutate(
      { id: payment.id, reason: values.reason },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject payment</DialogTitle>
          <DialogDescription>
            Rejecting {payment?.paymentNumber ?? 'this payment'} notifies the resident and keeps
            the funds unallocated.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Explain why this payment is being rejected (shown to the resident)."
                      {...field}
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
              <Button type="submit" variant="destructive" disabled={reject.isPending}>
                {reject.isPending ? 'Rejecting…' : 'Reject payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

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
import { useVerifySticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { stickerVerifySchema, type StickerVerifyValues } from '@/features/vehicle-stickers/validation/vehicle-sticker'
import type { StickerRequestListItem } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { formatCurrency } from '@/lib/format'

interface StickerVerifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: StickerRequestListItem | null
}

export function StickerVerifyDialog({ open, onOpenChange, request }: StickerVerifyDialogProps) {
  const verifySticker = useVerifySticker(() => onOpenChange(false))

  const form = useForm<StickerVerifyValues>({
    resolver: zodResolver(stickerVerifySchema),
    defaultValues: { approved: true, remarks: '', stickerNumber: '' },
  })

  useEffect(() => {
    if (open)
      form.reset({ approved: true, remarks: '', stickerNumber: '' })
  }, [open, form])

  const handleSubmit = (values: StickerVerifyValues) => {
    if (!request) return
    verifySticker.mutate({
      id: request.id,
      input: {
        approved: values.approved,
        remarks: values.remarks || undefined,
        stickerNumber: values.stickerNumber || undefined,
      },
    })
  }

  const pending = verifySticker.isPending
  const fee = Number(request?.feeTotal ?? 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review sticker request</DialogTitle>
          <DialogDescription>
            Approve or reject request{' '}
            <span className="font-mono text-foreground">{request?.requestNumber}</span> for{' '}
            <span className="font-medium text-foreground">{request?.vehicle?.plateNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantity</span>
            <span className="font-medium">{request?.quantity ?? 1}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Preferred number</span>
            <span className="font-medium font-mono">
              {request?.requestedStickerNumber ?? 'Auto-assigned'}
            </span>
          </div>
          {request?.requestedStickerNumber ? (
            <p className="text-xs text-muted-foreground">
              Used automatically if it is still available.
            </p>
          ) : null}
          {fee > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Household will be billed</span>
              <span className="font-medium">{formatCurrency(fee)}</span>
            </div>
          ) : null}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="stickerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sticker number override</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. STK-000100 (blank = auto-assign)" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Leave blank to auto-assign. When issuing multiple stickers,
                    the first sticker uses this number and the rest are
                    auto-generated.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional remarks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  form.setValue('approved', false)
                  form.handleSubmit(handleSubmit)()
                }}
              >
                {pending ? 'Saving…' : 'Reject'}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                onClick={() => form.setValue('approved', true)}
              >
                {pending ? 'Saving…' : 'Approve & issue'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
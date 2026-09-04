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
import { useStickerOptions, useVerifySticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { stickerVerifySchema, type StickerVerifyValues } from '@/features/vehicle-stickers/validation/vehicle-sticker'
import type { VehicleStickerListItem } from '@/features/vehicle-stickers/types/vehicle-sticker'
import { formatCurrency } from '@/lib/format'

interface StickerVerifyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sticker: VehicleStickerListItem | null
}

export function StickerVerifyDialog({
  open,
  onOpenChange,
  sticker,
}: StickerVerifyDialogProps) {
  const verifySticker = useVerifySticker(() => onOpenChange(false))
  const { data: options } = useStickerOptions()

  const form = useForm<StickerVerifyValues>({
    resolver: zodResolver(stickerVerifySchema),
    defaultValues: { approved: true, remarks: '' },
  })

  useEffect(() => {
    if (open) form.reset({ approved: true, remarks: '' })
  }, [open, form])

  const handleSubmit = (values: StickerVerifyValues) => {
    if (!sticker) return
    verifySticker.mutate({
      id: sticker.id,
      input: { approved: values.approved, remarks: values.remarks || undefined },
    })
  }

  const pending = verifySticker.isPending
  const price = options?.price ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify sticker</DialogTitle>
          <DialogDescription>
            Review and approve or reject sticker{' '}
            <span className="font-mono text-foreground">{sticker?.stickerNumber ?? 'pending'}</span>{' '}
            for{' '}
            <span className="font-medium text-foreground">{sticker?.vehicle?.plateNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        {price > 0 ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Household will be billed</span>
              <span className="font-medium">{formatCurrency(price)}</span>
            </div>
          </div>
        ) : null}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                {pending ? 'Saving…' : 'Approve'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
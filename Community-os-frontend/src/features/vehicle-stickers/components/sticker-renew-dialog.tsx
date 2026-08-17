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
import { useRenewSticker } from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import { stickerRenewSchema, type StickerRenewValues } from '@/features/vehicle-stickers/validation/vehicle-sticker'
import type { VehicleStickerListItem } from '@/features/vehicle-stickers/types/vehicle-sticker'

interface StickerRenewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sticker: VehicleStickerListItem | null
}

export function StickerRenewDialog({
  open,
  onOpenChange,
  sticker,
}: StickerRenewDialogProps) {
  const renewSticker = useRenewSticker(() => onOpenChange(false))

  const form = useForm<StickerRenewValues>({
    resolver: zodResolver(stickerRenewSchema),
    defaultValues: { expirationDate: '', notes: '' },
  })

  useEffect(() => {
    if (open) {
      const nextYear = new Date()
      nextYear.setFullYear(nextYear.getFullYear() + 1)
      form.reset({
        expirationDate: nextYear.toISOString().split('T')[0],
        notes: '',
      })
    }
  }, [open, form])

  const handleSubmit = (values: StickerRenewValues) => {
    if (!sticker) return
    renewSticker.mutate({
      id: sticker.id,
      input: {
        expirationDate: values.expirationDate,
        notes: values.notes || undefined,
      },
    })
  }

  const pending = renewSticker.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew sticker</DialogTitle>
          <DialogDescription>
            Extend the expiration for sticker{' '}
            <span className="font-mono text-foreground">{sticker?.stickerNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="expirationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New expiration date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                {pending ? 'Saving…' : 'Renew sticker'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

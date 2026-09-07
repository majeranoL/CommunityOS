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
import { Switch } from '@/components/ui/switch'
import {
  useStickerOptions,
  useUpdateStickerSettings,
} from '@/features/vehicle-stickers/hooks/use-vehicle-stickers'
import {
  stickerSettingsSchema,
  type StickerSettingsValues,
} from '@/features/vehicle-stickers/validation/vehicle-sticker'

interface StickerSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StickerSettingsDialog({ open, onOpenChange }: StickerSettingsDialogProps) {
  const { data: options } = useStickerOptions()
  const updateSettings = useUpdateStickerSettings(() => onOpenChange(false))

  const form = useForm<StickerSettingsValues>({
    resolver: zodResolver(stickerSettingsSchema),
    defaultValues: {
      cycleEnabled: false,
      cycleStart: '',
      cycleEnd: '',
      maxQuantity: '',
    },
  })

  useEffect(() => {
    if (open && options) {
      form.reset({
        cycleEnabled: options.cycle.enabled,
        cycleStart: options.cycle.start ?? '',
        cycleEnd: options.cycle.end ?? '',
        maxQuantity: String(options.maxQuantity),
      })
    }
  }, [open, options, form])

  const handleSubmit = (values: StickerSettingsValues) => {
    updateSettings.mutate({
      cycleEnabled: values.cycleEnabled,
      cycleStart: values.cycleEnabled && values.cycleStart ? values.cycleStart : undefined,
      cycleEnd: values.cycleEnabled && values.cycleEnd ? values.cycleEnd : undefined,
      maxQuantity: values.maxQuantity ? Number(values.maxQuantity) : 1,
    })
  }

  const pending = updateSettings.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sticker settings</DialogTitle>
          <DialogDescription>
            Configure the annual sticker cycle, price, and how many stickers a household can request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cycleEnabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Annual sticker cycle</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Expire stickers at a fixed date every year.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {form.watch('cycleEnabled') ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="cycleStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle start (MM-DD)</FormLabel>
                      <FormControl>
                        <Input placeholder="07-15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cycleEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle end (MM-DD)</FormLabel>
                      <FormControl>
                        <Input placeholder="07-14" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
            <FormField
              control={form.control}
              name="maxQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum stickers per request</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={100} {...field} value={field.value ?? ''} />
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
                {pending ? 'Saving…' : 'Save settings'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
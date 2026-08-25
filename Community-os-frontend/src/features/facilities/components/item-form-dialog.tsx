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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  useCreateFacilityItem,
  useUpdateFacilityItem,
} from '@/features/facilities/hooks/use-facility-items'
import {
  facilityItemSchema,
  type FacilityItemFormValues,
} from '@/features/facilities/validation/facility-item'
import { facilityItemCategories } from '@/features/facilities/types/facility-item'
import type { FacilityItem } from '@/features/facilities/types/facility-item'

interface ItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: FacilityItem | null
}

function toFormValues(item?: FacilityItem | null): FacilityItemFormValues {
  const fee = item?.borrowFee != null ? Number(item.borrowFee) : undefined
  return {
    name: item?.name ?? '',
    category: item?.category ?? 'OTHER',
    description: item?.description ?? '',
    quantityTotal: item != null ? String(item.quantityTotal) : '1',
    chargesFee: fee !== undefined && fee > 0,
    borrowFee: fee !== undefined && fee > 0 ? String(fee) : '',
    isActive: item?.isActive ?? true,
  }
}

export function ItemFormDialog({ open, onOpenChange, item }: ItemFormDialogProps) {
  const isEditing = Boolean(item)
  const createItem = useCreateFacilityItem()
  const updateItem = useUpdateFacilityItem()

  const form = useForm<FacilityItemFormValues>({
    resolver: zodResolver(facilityItemSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(item))
  }, [open, item, form])

  const chargesFee = form.watch('chargesFee')

  const handleSubmit = (values: FacilityItemFormValues) => {
    const input = {
      name: values.name,
      category: values.category || undefined,
      description: values.description || undefined,
      quantityTotal: Number(values.quantityTotal),
      borrowFee: values.chargesFee ? Number(values.borrowFee) : null,
      isActive: values.isActive,
    }

    if (isEditing && item) {
      updateItem.mutate(
        { id: item.id, input },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createItem.mutate(input, { onSuccess: () => onOpenChange(false) })
    }
  }

  const pending = createItem.isPending || updateItem.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit item' : 'Add borrowable item'}</DialogTitle>
          <DialogDescription>
            List an item residents can request to borrow.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monobloc Chair" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilityItemCategories.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional details" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantityTotal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total units</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>                  <FormDescription>Units owned by the community.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chargesFee"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Charges a borrowing fee?</FormLabel>
                    <FormDescription>
                      Leave off if the item is free to borrow.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            {chargesFee ? (
              <FormField
                control={form.control}
                name="borrowFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee per unit (₱)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step="0.01" placeholder="150.00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                      Charged automatically when a request is approved.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Available for borrowing</FormLabel>
                    <FormDescription>Inactive items cannot be requested.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Add item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

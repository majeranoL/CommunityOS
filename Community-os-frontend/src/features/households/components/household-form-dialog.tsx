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
  useCreateHousehold,
  useHousehold,
  useUpdateHousehold,
} from '@/features/households/hooks/use-households'
import { householdFormSchema, type HouseholdFormValues } from '@/features/households/validation/household'
import type { HouseholdDetail } from '@/features/households/types/household'

interface HouseholdFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId?: string | null
}

function toFormValues(household?: HouseholdDetail): HouseholdFormValues {
  return {
    block: household?.block ?? '',
    lot: household?.lot ?? '',
    unit: household?.unit ?? '',
    address: household?.address ?? '',
  }
}

export function HouseholdFormDialog({ open, onOpenChange, householdId }: HouseholdFormDialogProps) {
  const isEditing = Boolean(householdId)
  const { data: household, isLoading } = useHousehold(householdId ?? null)
  const createHousehold = useCreateHousehold(() => onOpenChange(false))
  const updateHousehold = useUpdateHousehold(() => onOpenChange(false))

  const form = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) {
      form.reset(isEditing ? toFormValues(household) : toFormValues())
    }
  }, [open, household, isEditing, form])

  const handleSubmit = (values: HouseholdFormValues) => {
    const input = {
      block: values.block || undefined,
      lot: values.lot || undefined,
      unit: values.unit || undefined,
      address: values.address || undefined,
    }

    if (isEditing && householdId) {
      updateHousehold.mutate({ id: householdId, input })
    } else {
      createHousehold.mutate(input)
    }
  }

  const pending = createHousehold.isPending || updateHousehold.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit household' : 'Add household'}</DialogTitle>
          <DialogDescription>
            Record a property unit in your community.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? null : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Block</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lot"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lot</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Unit 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 12 Sampaguita St." {...field} />
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
                  {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Add household'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

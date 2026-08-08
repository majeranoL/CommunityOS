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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FacilitySelect } from '@/features/maintenance/components/facility-select'
import { StaffSelect } from '@/features/maintenance/components/staff-select'
import { useCreateMaintenance, useUpdateMaintenance } from '@/features/maintenance/hooks/use-maintenance'
import { maintenanceFormSchema, type MaintenanceFormValues } from '@/features/maintenance/validation/maintenance'
import type { MaintenanceCategory, MaintenanceListItem, MaintenancePriority } from '@/features/maintenance/types/maintenance'

interface MaintenanceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  maintenance?: MaintenanceListItem | null
}

const CATEGORIES: MaintenanceCategory[] = [
  'ELECTRICAL',
  'PLUMBING',
  'LANDSCAPING',
  'STRUCTURAL',
  'ROADS',
  'FACILITY',
  'CLEANING',
  'OTHER',
]

const PRIORITIES: MaintenancePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

function toFormValues(maintenance?: MaintenanceListItem | null): MaintenanceFormValues {
  return {
    maintenanceNumber: maintenance?.maintenanceNumber ?? '',
    title: maintenance?.title ?? '',
    description: maintenance?.description ?? '',
    category: maintenance?.category ?? '',
    priority: maintenance?.priority ?? '',
    facilityId: maintenance?.facilityId ?? '',
    assignedToId: maintenance?.assignedToId ?? '',
    cost: maintenance?.cost !== null && maintenance?.cost !== undefined ? String(maintenance.cost) : '',
    scheduledAt: maintenance?.scheduledAt ? maintenance.scheduledAt.slice(0, 10) : '',
    remarks: maintenance?.remarks ?? '',
  }
}

export function MaintenanceFormDialog({ open, onOpenChange, maintenance }: MaintenanceFormDialogProps) {
  const isEditing = Boolean(maintenance)
  const createMaintenance = useCreateMaintenance(() => onOpenChange(false))
  const updateMaintenance = useUpdateMaintenance(() => onOpenChange(false))

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(maintenance))
  }, [open, maintenance, form])

  const handleSubmit = (values: MaintenanceFormValues) => {
    const input = {
      maintenanceNumber: values.maintenanceNumber,
      title: values.title,
      description: values.description || undefined,
      category: values.category as MaintenanceCategory,
      priority: (values.priority || undefined) as MaintenancePriority | undefined,
      facilityId: values.facilityId || undefined,
      assignedToId: values.assignedToId || undefined,
      cost: values.cost !== '' ? Number(values.cost) : undefined,
      scheduledAt: values.scheduledAt || undefined,
      remarks: values.remarks || undefined,
    }

    if (isEditing && maintenance) {
      updateMaintenance.mutate({ id: maintenance.id, input })
    } else {
      createMaintenance.mutate(input)
    }
  }

  const pending = createMaintenance.isPending || updateMaintenance.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit maintenance request' : 'New maintenance request'}</DialogTitle>
          <DialogDescription>
            Log a repair or upkeep task for community facilities.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="maintenanceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MNT-0004" {...field} />
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
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0) + category.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Repair broken streetlight" {...field} />
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
                    <Textarea placeholder="Details of the issue" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Medium" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((priority) => (
                            <SelectItem key={priority} value={priority}>
                              {priority.charAt(0) + priority.slice(1).toLowerCase()}
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
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled date</FormLabel>
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
              name="facilityId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Facility</FormLabel>
                  <FormControl>
                    <FacilitySelect value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Assigned to</FormLabel>
                  <FormControl>
                    <StaffSelect value={field.value ?? ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated cost</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="Optional" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Optional notes" rows={2} {...field} />
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
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Create request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

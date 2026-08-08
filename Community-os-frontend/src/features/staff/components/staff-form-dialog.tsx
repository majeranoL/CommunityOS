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
import { useCreateStaff, useUpdateStaff } from '@/features/staff/hooks/use-staff'
import { staffFormSchema, type StaffFormValues } from '@/features/staff/validation/staff'
import type { StaffListItem, StaffRole } from '@/features/staff/types/staff'

interface StaffFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff?: StaffListItem | null
}

const STAFF_ROLES: StaffRole[] = ['SECURITY', 'MAINTENANCE', 'CLEANING', 'ADMIN', 'OTHER']

function toFormValues(staff?: StaffListItem | null): StaffFormValues {
  return {
    staffNumber: staff?.staffNumber ?? '',
    firstName: staff?.firstName ?? '',
    middleName: staff?.middleName ?? '',
    lastName: staff?.lastName ?? '',
    role: staff?.role ?? '',
    phoneNumber: staff?.phoneNumber ?? '',
    email: staff?.email ?? '',
    hireDate: staff?.hireDate ? staff.hireDate.slice(0, 10) : '',
    notes: staff?.notes ?? '',
  }
}

export function StaffFormDialog({ open, onOpenChange, staff }: StaffFormDialogProps) {
  const isEditing = Boolean(staff)
  const createStaff = useCreateStaff(() => onOpenChange(false))
  const updateStaff = useUpdateStaff(() => onOpenChange(false))

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) form.reset(toFormValues(staff))
  }, [open, staff, form])

  const handleSubmit = (values: StaffFormValues) => {
    const input = {
      staffNumber: values.staffNumber,
      firstName: values.firstName,
      middleName: values.middleName || undefined,
      lastName: values.lastName,
      role: (values.role || undefined) as StaffRole | undefined,
      phoneNumber: values.phoneNumber || undefined,
      email: values.email || undefined,
      hireDate: values.hireDate || undefined,
      notes: values.notes || undefined,
    }

    if (isEditing && staff) {
      updateStaff.mutate({ id: staff.id, input })
    } else {
      createStaff.mutate(input)
    }
  }

  const pending = createStaff.isPending || updateStaff.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit staff member' : 'Add staff member'}</DialogTitle>
          <DialogDescription>
            Record non-login personnel such as guards, cleaners, and maintenance staff.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="staffNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. S-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {STAFF_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0) + role.slice(1).toLowerCase()}
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
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="09xx xxx xxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional notes" rows={3} {...field} />
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
                {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Add staff member'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

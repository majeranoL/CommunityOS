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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateRenter } from '@/features/users/hooks/use-users'
import {
  createRenterSchema,
  type CreateRenterFormValues,
} from '@/features/households/validation/create-renter'

interface CreateRenterDialogProps {
  householdId: string | null
  unitLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'] as const

export function CreateRenterDialog({
  householdId,
  unitLabel,
  open,
  onOpenChange,
}: CreateRenterDialogProps) {
  const createRenter = useCreateRenter(() => onOpenChange(false))

  const form = useForm<CreateRenterFormValues>({
    resolver: zodResolver(createRenterSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      gender: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset()
    }
  }, [open, form])

  const handleSubmit = (values: CreateRenterFormValues) => {
    if (!householdId) return

    createRenter.mutate({
      email: values.email,
      firstName: values.firstName,
      middleName: values.middleName || undefined,
      lastName: values.lastName,
      phoneNumber: values.phoneNumber || undefined,
      gender: (values.gender || undefined) as 'MALE' | 'FEMALE' | 'OTHER' | undefined,
      householdId,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign renter</DialogTitle>
          <DialogDescription>
            Create a limited tenant account for {unitLabel}. The renter will receive an email to set
            their password.
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
                      <Input placeholder="Dela Cruz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="renter@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option.charAt(0) + option.slice(1).toLowerCase()}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRenter.isPending}>
                {createRenter.isPending ? 'Creating…' : 'Create renter account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

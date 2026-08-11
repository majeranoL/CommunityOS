import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateUser, useRoles } from '@/features/users/hooks/use-users'
import { createUserSchema, type CreateUserValues } from '@/features/users/validation/create-user'
import { ResidentSelect } from '@/features/facilities/components/resident-select'
import { HouseholdSelect } from '@/features/finance/components/household-select'
import { cn } from '@/lib/utils'

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const LINK_OPTIONS = [
  { value: 'resident', label: 'Existing resident', description: 'Link to a person already in the residents list' },
  { value: 'household', label: 'Create in a household', description: 'Add a new resident record on a unit' },
] as const

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useCreateUser()
  const { data: roles, isLoading: rolesLoading } = useRoles()

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      password: '',
      roleId: '',
      linkType: 'resident',
      residentId: '',
      householdId: '',
      gender: undefined,
    },
  })

  const linkType = useWatch({ control: form.control, name: 'linkType' })
  const isResidentLink = linkType === 'resident'

  const handleSubmit = (values: CreateUserValues) => {
    createUser.mutate(
      {
        firstName: values.firstName,
        middleName: values.middleName || undefined,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: values.phoneNumber || undefined,
        password: values.password,
        roleId: values.roleId,
        residentId: isResidentLink ? values.residentId || undefined : undefined,
        householdId: !isResidentLink ? values.householdId || undefined : undefined,
        gender: values.gender,
      },
      {
        onSuccess: () => {
          form.reset()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create an account so a resident can access CommunityOS. Every account must be linked to
            a resident or household.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="linkType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link account to</FormLabel>
                  <FormControl>
                    <div className="grid gap-1 rounded-lg border bg-muted/40 p-1 sm:grid-cols-2">
                      {LINK_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            'rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                            field.value === option.value
                              ? 'bg-background shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => {
                            field.onChange(option.value)
                            if (option.value === 'resident') form.setValue('householdId', '')
                            if (option.value === 'household') form.setValue('residentId', '')
                          }}
                        >
                          {option.label}
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isResidentLink ? (
              <FormField
                control={form.control}
                name="residentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resident</FormLabel>
                    <FormControl>
                      <ResidentSelect
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onSelect={(resident) => {
                          form.setValue('firstName', resident.firstName)
                          form.setValue('middleName', resident.middleName ?? '')
                          form.setValue('lastName', resident.lastName)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The account takes the name and contact details from the residents list.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
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
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {!isResidentLink ? (
              <FormField
                control={form.control}
                name="householdId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Household</FormLabel>
                    <FormControl>
                      <HouseholdSelect value={field.value ?? ''} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>
                      A new resident record will be created on this unit and linked to the account.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Minimum 8 characters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger disabled={rolesLoading}>
                        <SelectValue placeholder={rolesLoading ? 'Loading roles…' : 'Select a role'} />
                      </SelectTrigger>
                      <SelectContent>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? 'Creating…' : 'Create user'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

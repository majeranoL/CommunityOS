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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HouseholdSelect } from '@/features/residents/components/household-select'
import { useCreateResident, useResident, useUpdateResident } from '@/features/residents/hooks/use-residents'
import { residentFormSchema, type ResidentFormValues } from '@/features/residents/validation/resident'
import type { CivilStatus, CreateResidentInput, Gender, ResidentDetail, ResidentType } from '@/features/residents/types/resident'

interface ResidentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  residentId?: string | null
  selfService?: boolean
}

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'] as const
const CIVIL_STATUS_OPTIONS = ['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED', 'SEPARATED'] as const
const RESIDENT_TYPE_OPTIONS = ['OWNER', 'RENTER'] as const

function toFormValues(resident?: ResidentDetail): ResidentFormValues {
  return {
    firstName: resident?.firstName ?? '',
    middleName: resident?.middleName ?? '',
    lastName: resident?.lastName ?? '',
    suffix: resident?.suffix ?? '',
    birthDate: resident?.birthDate ? resident.birthDate.slice(0, 10) : '',
    gender: resident?.gender ?? '',
    civilStatus: resident?.civilStatus ?? '',
    phoneNumber: resident?.phoneNumber ?? '',
    email: resident?.email ?? '',
    householdId: resident?.householdId ?? '',
    residentType: resident?.residentType ?? '',
    block: resident?.block ?? '',
    lot: resident?.lot ?? '',
    street: resident?.street ?? '',
    address: resident?.address ?? '',
    remarks: resident?.remarks ?? '',
  }
}

export function ResidentFormDialog({
  open,
  onOpenChange,
  residentId,
  selfService = false,
}: ResidentFormDialogProps) {
  const isEditing = Boolean(residentId)
  const { data: resident, isLoading } = useResident(residentId ?? null)
  const createResident = useCreateResident(() => onOpenChange(false))
  const updateResident = useUpdateResident(() => onOpenChange(false))

  const form = useForm<ResidentFormValues>({
    resolver: zodResolver(residentFormSchema),
    defaultValues: toFormValues(),
  })

  useEffect(() => {
    if (open) {
      form.reset(isEditing ? toFormValues(resident) : toFormValues())
    }
  }, [open, resident, isEditing, form])

  const handleSubmit = (values: ResidentFormValues) => {
    const input: CreateResidentInput = {
      firstName: values.firstName,
      middleName: values.middleName || undefined,
      lastName: values.lastName,
      suffix: values.suffix || undefined,
      birthDate: values.birthDate || undefined,
      gender: (values.gender || undefined) as Gender | undefined,
      civilStatus: (values.civilStatus || undefined) as CivilStatus | undefined,
      phoneNumber: values.phoneNumber || undefined,
      email: values.email || undefined,
      householdId: values.householdId || undefined,
      residentType:
        !selfService && values.residentType
          ? (values.residentType as ResidentType)
          : undefined,
      block: values.block || undefined,
      lot: values.lot || undefined,
      street: values.street || undefined,
      address: values.address || undefined,
      remarks: values.remarks || undefined,
    }

    if (isEditing && residentId) {
      updateResident.mutate({ id: residentId, input })
    } else {
      createResident.mutate(input)
    }
  }

  const pending = createResident.isPending || updateResident.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit resident' : 'Add resident'}</DialogTitle>
          <DialogDescription>
            Record a resident in your community directory.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? null : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {selfService ? (
                <p className="text-sm text-muted-foreground">
                  This resident will be added to your household.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="householdId"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel>Household</FormLabel>
                        <FormControl>
                          <HouseholdSelect value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormDescription>
                          Assign the unit this resident belongs to.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!isEditing && (
                    <FormField
                      control={form.control}
                      name="residentType"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel>Resident type</FormLabel>
                          <FormControl>
                            <Select value={field.value || 'OWNER'} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Owner" />
                              </SelectTrigger>
                              <SelectContent>
                                {RESIDENT_TYPE_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option.charAt(0) + option.slice(1).toLowerCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>Owner or renter occupancy.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

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
                  name="suffix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suffix</FormLabel>
                      <FormControl>
                        <Input placeholder="Jr., Sr., II" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
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
                <FormField
                  control={form.control}
                  name="civilStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civil status</FormLabel>
                      <FormControl>
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {CIVIL_STATUS_OPTIONS.map((option) => (
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
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birth date</FormLabel>
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
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="mb-3 text-sm font-medium">Unit details</p>
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
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="street"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sampaguita St." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Full address" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : isEditing ? 'Save changes' : 'Add resident'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

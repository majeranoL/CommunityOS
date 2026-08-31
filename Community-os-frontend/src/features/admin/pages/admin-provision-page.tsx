import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { PasswordInput } from '@/components/ui/password-input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { usePlans } from '@/features/landing/hooks/use-plans'
import { useProvisionCommunity } from '@/features/admin/hooks/use-admin'
import { usePageTitle } from '@/lib/use-page-title'
import { formatCurrency } from '@/lib/format'
import { z } from 'zod'

const provisionSchema = z
  .object({
    displayName: z.string().min(2, 'Community name is required'),
    description: z.string().optional(),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .or(z.literal('')),
    contactNumber: z.string().optional(),
    address: z.string().optional(),
    planId: z.string().min(1, 'Please select a plan'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    ownerEmail: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Password must contain a letter and a number'),
    confirmPassword: z.string(),
    block: z.string().optional(),
    lot: z.string().optional(),
    unit: z.string().optional(),
    ownerAddress: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) =>
      Boolean(
        data.block?.trim() ||
          data.lot?.trim() ||
          data.unit?.trim() ||
          data.ownerAddress?.trim(),
      ),
    {
      message: 'Provide at least one of block, lot, unit, or address for the owner.',
      path: ['block'],
    },
  )

type ProvisionValues = z.infer<typeof provisionSchema>

export default function AdminProvisionPage() {
  const navigate = useNavigate()
  const { data: plans, isLoading } = usePlans()
  const provision = useProvisionCommunity()

  usePageTitle('Provision community')

  const form = useForm<ProvisionValues>({
    resolver: zodResolver(provisionSchema),
    defaultValues: {
      displayName: '',
      description: '',
      email: '',
      contactNumber: '',
      address: '',
      planId: '',
      firstName: '',
      lastName: '',
      ownerEmail: '',
      password: '',
      confirmPassword: '',
      block: '',
      lot: '',
      unit: '',
      ownerAddress: '',
    },
  })

  const watchPlanId = form.watch('planId')

  const onSubmit = (values: ProvisionValues) => {
    provision.mutate(
      {
        displayName: values.displayName,
        description: values.description || undefined,
        email: values.email || undefined,
        contactNumber: values.contactNumber || undefined,
        address: values.address || undefined,
        planId: values.planId,
        owner: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.ownerEmail,
          password: values.password,
          block: values.block?.trim() || undefined,
          lot: values.lot?.trim() || undefined,
          unit: values.unit?.trim() || undefined,
          address: values.ownerAddress?.trim() || undefined,
        },
      },
      { onSuccess: () => navigate('/admin/communities') },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Provision community" description="Manually create a new community and its admin account.">
        <Button variant="outline" onClick={() => navigate('/admin/communities')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>New community</CardTitle>
          <CardDescription>This creates the community, its owner account, and optional subscription.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Community name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sunrise Village HOA" {...field} />
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
                      <Textarea placeholder="A short description (optional)" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Community email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hoa@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact number</FormLabel>
                      <FormControl>
                        <Input placeholder="0917 123 4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="City or barangay (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Plan</FormLabel>
                {isLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(plans ?? []).map((plan) => {
                      const selected = watchPlanId === plan.id
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => form.setValue('planId', plan.id, { shouldValidate: true })}
                          className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors ${
                            selected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'border-border hover:border-primary/40'
                          }`}
                        >
                          <span className="font-medium">{plan.name}</span>
                          <span className="mt-1 text-xs text-muted-foreground">{plan.description}</span>
                          <span className="mt-2 text-sm font-semibold">
                            {formatCurrency(plan.price)}
                            <span className="font-normal text-muted-foreground">
                              /{plan.billingCycle === 'YEARLY' ? 'year' : 'month'}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <FormMessage>{form.formState.errors.planId?.message}</FormMessage>
              </FormItem>

              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="mb-3 text-sm font-medium">Owner account</p>
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
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="owner@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="mt-4">
                  <p className="mb-3 text-sm font-medium">Owner unit</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="block"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Block</FormLabel>
                          <FormControl>
                            <Input placeholder="A" {...field} />
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
                            <Input placeholder="12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="Unit 3B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="ownerAddress"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Block A, Lot 12 – 12 Sampaguita St." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    The owner will be linked to this household as the community President.
                  </p>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <PasswordInput {...field} />
                        </FormControl>
                        <FormDescription>At least 8 characters with a letter and a number.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <PasswordInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button type="submit" disabled={provision.isPending}>
                {provision.isPending ? 'Provisioning…' : 'Provision community'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

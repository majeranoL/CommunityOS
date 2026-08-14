import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { usePlans } from '@/features/landing/hooks/use-plans'
import { useSignupHoa } from '@/features/get-started/hooks/use-signup-hoa'
import { formatCurrency } from '@/lib/format'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import {
  communityStepSchema,
  accountStepSchema,
  getStartedSchema,
  type GetStartedValues,
} from '@/features/get-started/validation/get-started'

const STEPS = ['Community', 'Owner account']

export default function GetStartedPage() {
  const location = useLocation()
  const { data: plans, isLoading } = usePlans()
  const signup = useSignupHoa()
  const [step, setStep] = useState(0)
  const preselectPlanId = (location.state as { planId?: string } | null)?.planId ?? ''

  usePageTitle('Get started')

  const form = useForm<GetStartedValues>({
    resolver: zodResolver(getStartedSchema),
    defaultValues: {
      displayName: '',
      description: '',
      email: '',
      contactNumber: '',
      address: '',
      planId: preselectPlanId,
      firstName: '',
      lastName: '',
      ownerEmail: '',
      password: '',
      confirmPassword: '',
    },
  })

  const watchPlanId = form.watch('planId')

  const next = async () => {
    const schema = step === 0 ? communityStepSchema : accountStepSchema
    const fields = Object.keys(schema.shape) as (keyof GetStartedValues)[]
    const valid = await form.trigger(fields)
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const back = () => setStep((current) => Math.max(current - 1, 0))

  const onSubmit = (values: GetStartedValues) => {
    signup.mutate({
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
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            C
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Start your community</h1>
            <p className="text-sm text-muted-foreground">
              Set up CommunityOS for your HOA in a few minutes.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {index + 1}
              </div>
              <span
                className={cn(
                  'text-sm',
                  index === step ? 'font-medium' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              {index < STEPS.length - 1 ? <div className="h-px w-8 bg-border" /> : null}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0
                ? 'Tell us about your community and choose a plan.'
                : 'Create the account that will manage this community.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {step === 0 ? (
                  <>
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
                            <Textarea
                              placeholder="A short description of your community (optional)"
                              rows={2}
                              {...field}
                            />
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
                      <FormLabel>Choose a plan</FormLabel>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-24" />
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
                                className={cn(
                                  'flex flex-col items-start rounded-lg border p-4 text-left transition-colors',
                                  selected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border hover:border-primary/40',
                                )}
                              >
                                <div className="flex w-full items-center justify-between">
                                  <span className="font-medium">{plan.name}</span>
                                  <span
                                    className={cn(
                                      'flex h-5 w-5 items-center justify-center rounded-full border',
                                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                                    )}
                                  >
                                    {selected ? <Check className="h-3 w-3" /> : null}
                                  </span>
                                </div>
                                <span className="mt-1 text-xs text-muted-foreground">
                                  {plan.description}
                                </span>
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
                  </>
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
                              <Input placeholder="Juan" autoComplete="given-name" {...field} />
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
                              <Input placeholder="Dela Cruz" autoComplete="family-name" {...field} />
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
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                          </FormControl>
                          <FormDescription>You&apos;ll use this to sign in.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <PasswordInput autoComplete="new-password" {...field} />
                            </FormControl>
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
                              <PasswordInput autoComplete="new-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            {step > 0 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={form.handleSubmit(onSubmit)} disabled={signup.isPending}>
                {signup.isPending ? 'Creating…' : 'Create community'}
              </Button>
            )}
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

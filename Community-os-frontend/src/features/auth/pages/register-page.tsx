import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CommunityPicker } from '@/features/auth/components/community-picker'
import { useRegister, useSendOtp } from '@/features/auth/hooks/use-auth'
import { registerSchema, type RegisterValues } from '@/features/auth/validation/register'
import { usePageTitle } from '@/lib/use-page-title'
import { apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

const STEP_LABELS = ['Details', 'Verify', 'Done']

const STEP_0_FIELDS = [
  'communityId',
  'firstName',
  'middleName',
  'lastName',
  'gender',
  'email',
  'phoneNumber',
  'password',
  'confirmPassword',
  'block',
  'lot',
  'unit',
  'address',
] as const

const OTP_RESEND_SECONDS = 30

function StepIndicator({ step }: { step: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-4">
      {STEP_LABELS.map((label, index) => {
        const active = index === step
        const done = index < step
        return (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                active
                  ? 'bg-primary text-primary-foreground'
                  : done
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span className={cn('text-xs', active ? 'font-medium' : 'text-muted-foreground')}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function RegisterPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [devCode, setDevCode] = useState<{
    email: string
    communityId: string
    code: string
  } | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const autoSentKey = useRef<string | null>(null)

  const sendOtp = useSendOtp({
    onSuccess: (result) => {
      const code = result.data?.devCode
      setDevCode(code ? { email, communityId, code } : null)
      setSendError(null)
      setResendCooldown(OTP_RESEND_SECONDS)
    },
    onError: (error) => {
      setSendError(apiErrorMessage(error, 'Could not send the verification code.'))
    },
  })
  const register = useRegister({
    onSuccess: () => setStep(2),
    onError: () => {},
  })

  usePageTitle('Create an account')

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      gender: '',
      password: '',
      confirmPassword: '',
      communityId: '',
      otpCode: '',
      block: '',
      lot: '',
      unit: '',
      address: '',
    },
  })

  const email = form.watch('email')
  const communityId = form.watch('communityId')

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((seconds) => seconds - 1), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (step !== 1) return
    const key = `${email}|${communityId}`
    if (autoSentKey.current === key) return
    autoSentKey.current = key
    void sendOtp.mutateAsync({ email, communityId }).catch(() => {})
  }, [step, email, communityId, sendOtp])

  const handleContinue = async () => {
    const valid = await form.trigger(STEP_0_FIELDS)
    if (valid) setStep(1)
  }

  const handleResendOtp = () => {
    if (resendCooldown > 0 || sendOtp.isPending) return
    void sendOtp.mutateAsync({ email, communityId }).catch(() => {})
  }

  const onSubmit = (values: RegisterValues) => {
    register.mutate({
      firstName: values.firstName,
      middleName: values.middleName || undefined,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      phoneNumber: values.phoneNumber || undefined,
      communityId: values.communityId,
      gender: (values.gender as 'MALE' | 'FEMALE' | 'OTHER') || undefined,
      otpCode: values.otpCode,
      block: values.block || undefined,
      lot: values.lot || undefined,
      unit: values.unit || undefined,
      address: values.address || undefined,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            C
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              {step === 0
                ? 'Join your community. Your account becomes active once an administrator approves it.'
                : step === 1
                  ? 'Enter the verification code we sent to your email.'
                  : 'Your request is being reviewed.'}
            </p>
          </div>
        </div>

        <StepIndicator step={step} />

        {step === 2 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Almost done!</h2>
                <p className="text-sm text-muted-foreground">
                  Your account is pending approval by an administrator. You&apos;ll be able to sign
                  in once it&apos;s approved.
                </p>
              </div>
              <Button asChild className="mt-2 w-full">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{step === 0 ? 'Account details' : 'Verify your email'}</CardTitle>
              <CardDescription>
                {step === 0
                  ? 'Tell us who you are and how to reach you.'
                  : 'Confirm this address belongs to you to finish creating your account.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {step === 0 ? (
                    <>
                      <FormField
                        control={form.control}
                        name="communityId"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>Community</FormLabel>
                            <FormControl>
                              <CommunityPicker
                                value={field.value || null}
                                onChange={(community) => field.onChange(community?.id ?? '')}
                                onBlur={field.onBlur}
                                error={undefined}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

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
                            <Select value={field.value || undefined} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
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
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
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
                                <Input placeholder="09xx xxx xxxx" autoComplete="tel" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

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

                      <div className="rounded-lg border bg-muted/40 p-4">
                        <p className="mb-3 text-sm font-medium">Your unit</p>
                        <div className="grid gap-4 sm:grid-cols-3">
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
                        </div>
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="mt-4">
                              <FormLabel>Street address</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 12 Sampaguita St." {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormDescription className="mt-2">
                          Provide at least one of block, lot, unit, or address so we can match your household.
                        </FormDescription>
                      </div>

                      <Button type="button" className="w-full" onClick={handleContinue}>
                        Continue
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                        <FormField
                          control={form.control}
                          name="otpCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Verification code</FormLabel>
                              <FormControl>
                                <Input
                                  inputMode="numeric"
                                  placeholder="6-digit code"
                                  maxLength={6}
                                  autoFocus
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {devCode && devCode.email === email && devCode.communityId === communityId ? (
                          <div className="mt-3 rounded-md border border-dashed p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Email delivery is not configured yet. Enter this code:
                            </p>
                            <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em]">
                              {devCode.code}
                            </p>
                          </div>
                        ) : (
                          <FormDescription className="mt-2">
                            We&apos;ll email you a 6-digit code to confirm this address belongs to you.
                          </FormDescription>
                        )}
                      </div>

                      {sendError ? (
                        <p className="text-sm font-medium text-destructive">{sendError}</p>
                      ) : null}

                      <p className="text-sm text-muted-foreground">
                        Didn&apos;t get it?{' '}
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline disabled:opacity-50"
                          onClick={handleResendOtp}
                          disabled={resendCooldown > 0 || sendOtp.isPending}
                        >
                          {sendOtp.isPending
                            ? 'Sending…'
                            : resendCooldown > 0
                              ? `Resend in ${resendCooldown}s`
                              : 'Resend code'}
                        </button>
                      </p>

                      {register.error && (
                        <Alert variant="destructive">
                          <AlertDescription>
                            {apiErrorMessage(register.error, 'Registration failed. Please try again.')}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setStep(0)}
                          disabled={register.isPending}
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={register.isPending}>
                          {register.isPending ? 'Submitting…' : 'Verify & submit'}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

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

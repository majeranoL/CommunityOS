import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { useStorefront } from '@/features/storefront/storefront-context'
import { StorefrontLogo } from '@/features/storefront/components/storefront-logo'
import { useLogin } from '@/features/auth/hooks/use-auth'
import {
  loginSchema,
  type LoginValues,
} from '@/features/auth/validation/register'
import { usePageTitle } from '@/lib/use-page-title'

export default function TenantLoginPage() {
  const community = useStorefront()
  const login = useLogin()
  const registerPath = `/c/${community.slug}/register`

  usePageTitle(`Sign in · ${community.displayName}`)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: LoginValues) => {
    login.mutate({ email: values.email, password: values.password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <StorefrontLogo community={community} className="h-12 w-12" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {community.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your community
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex w-full items-center justify-between">
                        Password
                        <Link
                          to="/forgot-password"
                          className="text-xs font-normal text-muted-foreground hover:text-primary hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={login.isPending}
                >
                  {login.isPending ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          New to your community?{' '}
          <Link
            to={
              community.registrationOpen ? registerPath : `/c/${community.slug}`
            }
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link
            to={`/c/${community.slug}`}
            className="text-muted-foreground hover:text-primary hover:underline"
          >
            Back to {community.displayName}
          </Link>
        </p>
      </div>
    </div>
  )
}

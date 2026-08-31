import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useStorefront } from '@/features/storefront/storefront-context'
import { StorefrontLogo } from '@/features/storefront/components/storefront-logo'
import { usePageTitle } from '@/lib/use-page-title'

const FEATURES = [
  {
    icon: Users,
    title: 'Residents & households',
    description:
      'Manage residents, households, and verified occupant accounts.',
  },
  {
    icon: Megaphone,
    title: 'Announcements & events',
    description:
      'Keep everyone informed with announcements, events, and RSVPs.',
  },
  {
    icon: CalendarDays,
    title: 'Facility reservations',
    description:
      'Book clubhouses, courts, and amenities with approvals built in.',
  },
  {
    icon: Bell,
    title: 'Complaints & requests',
    description: 'Let residents raise concerns and track them to resolution.',
  },
  {
    icon: Building2,
    title: 'Community finances',
    description: 'Assessments, dues, and payments tracked transparently.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    description: 'Role-based access and audit trails for your community.',
  },
]

export default function TenantLandingPage() {
  const community = useStorefront()
  const loginPath = `/c/${community.slug}/login`
  const registerPath = `/c/${community.slug}/register`

  usePageTitle(community.displayName)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <StorefrontLogo community={community} />
            <span className="text-sm font-semibold">
              {community.displayName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to={loginPath}>Sign in</Link>
            </Button>
            {community.registrationOpen ? (
              <Button asChild size="sm">
                <Link to={registerPath}>Join</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-24">
          {community.branding.logoUrl ? (
            <div className="mb-6 flex justify-center">
              <StorefrontLogo community={community} className="h-16 w-16" />
            </div>
          ) : null}
          <Badge variant="secondary" className="mb-4">
            {community.address ?? 'Homeowners association'}
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to {community.displayName}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {community.description ??
              'Your community portal for residents, announcements, facilities, and more.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={loginPath}>
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {community.registrationOpen ? (
              <Button asChild size="lg" variant="outline">
                <Link to={registerPath}>Create an account</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              What&apos;s here
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Everything you need for day-to-day community life.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border bg-card p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Member of {community.displayName}?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Sign in to pay dues, book facilities, report issues, and more.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to={loginPath}>Sign in to your account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <StorefrontLogo community={community} className="h-5 w-5" />
            <span>{community.displayName}</span>
          </div>
          <p>
            © {new Date().getFullYear()} {community.displayName}. Powered by
            CommunityOS.
          </p>
        </div>
      </footer>
    </div>
  )
}

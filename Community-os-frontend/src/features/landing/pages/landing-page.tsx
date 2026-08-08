import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  Layers,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlans } from '@/features/landing/hooks/use-plans'
import { useAuthStore } from '@/store/auth-store'
import { formatCurrency } from '@/lib/format'
import { usePageTitle } from '@/lib/use-page-title'
import { cn } from '@/lib/utils'
import type { SubscriptionPlan } from '@/types/api'

const FEATURES = [
  {
    icon: Users,
    title: 'Residents & households',
    description: 'Manage residents, households, and occupants with verified accounts.',
  },
  {
    icon: Megaphone,
    title: 'Announcements & events',
    description: 'Keep everyone informed with announcements, events, and RSVPs.',
  },
  {
    icon: CalendarDays,
    title: 'Facility reservations',
    description: 'Book clubhouses, courts, and amenities with approvals built in.',
  },
  {
    icon: Bell,
    title: 'Complaints & requests',
    description: 'Let residents raise concerns and track them to resolution.',
  },
  {
    icon: Layers,
    title: 'Polls & decisions',
    description: 'Run community polls so members have a say in the neighborhood.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    description: 'Role-based access, audit trails, and data you control.',
  },
]

function PlanCard({ plan, highlighted }: { plan: SubscriptionPlan; highlighted: boolean }) {
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-6',
        highlighted ? 'border-primary shadow-lg shadow-primary/10' : 'border-border',
      )}
    >
      {highlighted ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
      ) : null}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
        <span className="text-sm text-muted-foreground">
          /{plan.billingCycle === 'YEARLY' ? 'year' : 'month'}
        </span>
      </div>
      <ul className="mt-6 flex flex-1 flex-col gap-2.5">
        {(plan.features ?? []).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button
        className="mt-6"
        variant={highlighted ? 'default' : 'outline'}
        onClick={() => navigate('/get-started', { state: { planId: plan.id } })}
      >
        Get started
      </Button>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated')
  const { data: plans, isLoading } = usePlans()

  usePageTitle('CommunityOS — Run your community on one platform')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              C
            </div>
            <span className="text-sm font-semibold">CommunityOS</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Button size="sm" onClick={() => navigate('/app/dashboard')}>
                Go to dashboard
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => navigate('/get-started')}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 text-center sm:pt-24">
          <Badge variant="secondary" className="mb-4">
            Built for Philippine HOAs and homeowners associations
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Everything your community needs, in one place
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            CommunityOS helps HOAs manage residents, announcements, facilities, payments, and more —
            without the spreadsheets and group chats.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate('/get-started')}>
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free 30-day trial · No credit card required
          </p>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">What&apos;s inside</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              A complete toolkit to run your community smoothly.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="rounded-2xl border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section id="pricing" className="bg-muted/40 py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                Start free, scale as your community grows. Cancel anytime.
              </p>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading
                ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)
                : (plans ?? []).map((plan, index) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      highlighted={index === Math.floor((plans?.length ?? 0) / 2)}
                    />
                  ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to bring your community online?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Set up your HOA in minutes. No technical skills needed.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate('/get-started')}>
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>CommunityOS</span>
          </div>
          <p>© {new Date().getFullYear()} CommunityOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

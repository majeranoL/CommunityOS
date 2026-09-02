import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  ClipboardList,
  CreditCard,
  FileText,
  Landmark,
  Megaphone,
  PawPrint,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stamp,
  Users,
  Wrench,
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

const CORE_FEATURES = [
  {
    icon: Users,
    title: 'Residents & households',
    description:
      'Manage owners, renters, and households with full occupancy history, ownership transfers, and verification.',
  },
  {
    icon: Megaphone,
    title: 'Community communication',
    description:
      'Publish announcements, schedule events with RSVPs, and run community polls — all in one hub.',
  },
  {
    icon: Building2,
    title: 'Facilities & reservations',
    description:
      'Book clubhouses, courts, pools, and more. Approvals, item lending, and schedule management built in.',
  },
  {
    icon: ClipboardList,
    title: 'Complaints & maintenance',
    description:
      'Residents file service requests with tracking, assignment, and resolution workflows for your officers.',
  },
  {
    icon: Landmark,
    title: 'Payments & billing',
    description:
      'Issue monthly dues, track assessments, accept cash/bank/GCash payments, and reconcile income statements.',
  },
  {
    icon: BarChart3,
    title: 'Reports & analytics',
    description:
      'Export 12+ report types, analyze financial trends, and make data-driven decisions for your community.',
  },
]

const EXTENDED_FEATURES = [
  {
    icon: ScanLine,
    title: 'Visitor & gate management',
    description: 'QR passes, check-in/out, and guest verification.',
  },
  {
    icon: Wrench,
    title: 'Staff management',
    description: 'Track security, maintenance, and cleaning staff.',
  },
  {
    icon: FileText,
    title: 'Documents & records',
    description: 'Centralized secure storage for HOA records.',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: '11 notification types with in-app inbox.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit logging',
    description: 'Full trail on every action, forever.',
  },
  {
    icon: Sparkles,
    title: 'Import & export',
    description: 'CSV/XLSX for all major data modules.',
  },
  {
    icon: CreditCard,
    title: 'Community branding',
    description: '8 themes, white-label, custom colors.',
  },
  {
    icon: Users,
    title: 'Role-based access',
    description: '130+ granular permissions per role.',
  },
]

const OPTIONAL_FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Good / Bad Standing',
    description:
      'Compute household standing from payment records. Generate QR verification passes for the gate. Restrict facility reservations for delinquent households.',
    badge: 'Add-on',
  },
  {
    icon: PawPrint,
    title: 'Pet Registration',
    description:
      'Register pets by species with photo, microchip, and vaccination certificates. Approve or auto-verify registrations linked to households.',
    badge: 'Add-on',
  },
  {
    icon: Stamp,
    title: 'Vehicle Stickers',
    description:
      'Issue and manage parking stickers with verification, renewal, expiry tracking, and associated fees.',
    badge: 'Add-on',
  },
]

const STATS = [
  { value: '50+', label: 'Features built' },
  { value: '130+', label: 'Granular permissions' },
  { value: '9', label: 'Facility types' },
  { value: '24/7', label: 'Cloud access' },
]

function PlanCard({
  plan,
  highlighted,
}: {
  plan: SubscriptionPlan
  highlighted: boolean
}) {
  const navigate = useNavigate()
  const linkedFeatures = plan.planFeatures?.map((pf) => pf.feature) ?? []
  const standardIncluded = linkedFeatures.filter((f) => f.type === 'STANDARD')
  const optionalIncluded = linkedFeatures.filter((f) => f.type === 'OPTIONAL')
  const hasLinked = linkedFeatures.length > 0

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border bg-card p-6',
        highlighted
          ? 'border-primary shadow-lg shadow-primary/10'
          : 'border-border',
      )}
    >
      {highlighted ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most popular
        </Badge>
      ) : null}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-1 min-h-10 text-sm text-muted-foreground">
        {plan.description}
      </p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
        <span className="text-sm text-muted-foreground">
          /{plan.billingCycle === 'YEARLY' ? 'year' : 'month'}
        </span>
      </div>

      {plan.includesAllFeatures ? (
        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          <li className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>All features included</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Every current and future module</span>
          </li>
        </ul>
      ) : hasLinked ? (
        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          {optionalIncluded.map((feature) => (
            <li key={feature.id} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature.name}</span>
            </li>
          ))}
          <li className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
            <span>
              {standardIncluded.length > 0
                ? `Plus ${standardIncluded.length} standard modules`
                : 'All standard modules included'}
            </span>
          </li>
        </ul>
      ) : (
        <ul className="mt-6 flex flex-1 flex-col gap-2.5">
          {(plan.features ?? []).map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

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
  const isAuthenticated = useAuthStore(
    (state) => state.status === 'authenticated',
  )
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
            <a href="#addons" className="hover:text-foreground">
              Add-ons
            </a>
            <a href="#how-it-works" className="hover:text-foreground">
              How it works
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/login')}
                >
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
        {/* ===================== HERO ===================== */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-16 text-center sm:pt-24">
          <Badge variant="secondary" className="mb-4">
            Built for Philippine HOAs and homeowners associations
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Your community, managed in one platform
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Manage residents, facilities, payments, complaints, and
            communication — without the spreadsheets, group chats, and paper
            trails.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate('/get-started')}>
              Get started free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
            >
              Sign in
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free 30-day trial · No credit card required
          </p>
        </section>

        {/* ===================== STATS ===================== */}
        <section className="border-y bg-muted/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-4 px-4 py-8 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== CORE FEATURES ===================== */}
        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything your community needs
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              A complete toolkit built for how HOAs actually operate.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CORE_FEATURES.map((feature) => {
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

        {/* ===================== EXTENDED FEATURES ===================== */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Built for every aspect of community life
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                From gate security to document management — nothing left to
                chance.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXTENDED_FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="rounded-2xl border bg-card p-5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ===================== OPTIONAL ADD-ONS ===================== */}
        <section id="addons" className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Extend your platform with add-on modules
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Enable only the optional modules your HOA needs. Toggle them on
              per community from the admin panel.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {OPTIONAL_FEATURES.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="flex flex-col rounded-2xl border bg-card p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="warning">{feature.badge}</Badge>
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section id="how-it-works" className="border-t bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Up and running in minutes
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                No technical skills needed. Start managing your community today.
              </p>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Create your community',
                  description:
                    'Set up your HOA with a plan, branding, community settings, and your admin account.',
                },
                {
                  step: '2',
                  title: 'Invite your residents',
                  description:
                    'Members register with their unit and household. Approve them, or let them self-register.',
                },
                {
                  step: '3',
                  title: 'Start managing',
                  description:
                    'Post announcements, collect monthly dues, manage facilities, and resolve issues.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="relative rounded-2xl border bg-card p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== PRICING ===================== */}
        <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Start free, scale as your community grows. Cancel anytime.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? [0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-96 rounded-2xl" />
                ))
              : (plans ?? []).map((plan, index) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    highlighted={index === Math.floor((plans?.length ?? 0) / 2)}
                  />
                ))}
          </div>
        </section>

        {/* ===================== FINAL CTA ===================== */}
        <section className="border-t bg-muted/40">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center">
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
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>CommunityOS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link to="/get-started" className="hover:text-foreground">
              Get started
            </Link>
          </div>
          <p>© {new Date().getFullYear()} CommunityOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

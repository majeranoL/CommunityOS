import { useState } from 'react'
import { AlertTriangle, Banknote, Building2, Check, CreditCard, RefreshCcw, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import {
  useBillingLimits,
  useBillingSummary,
  useCancelSubscription,
  useInvoices,
  usePlansList,
  useRenewSubscription,
  useSubscribeToPlan,
  useSubscription,
} from '@/features/billing/hooks/use-billing'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

function UsageMeter({
  label,
  used,
  limit,
  exceeded,
  loading,
}: {
  label: string
  used: number
  limit: number
  exceeded: boolean
  loading: boolean
}) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        {loading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="font-medium">
            {used.toLocaleString()} / {limit > 0 ? limit.toLocaleString() : 'Unlimited'}
          </span>
        )}
      </div>
      {!loading && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', exceeded ? 'bg-destructive' : 'bg-primary')}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {exceeded && (
        <p className="text-xs text-destructive">Exceeded the limit. Upgrade your plan to continue adding.</p>
      )}
    </div>
  )
}

function PlanSelectDialog({ currentPlanId }: { currentPlanId: string | null }) {
  const { data: plans, isLoading } = usePlansList()
  const subscribe = useSubscribeToPlan()
  const [selectedId, setSelectedId] = useState<string | null>(currentPlanId)
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Change plan</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a plan</DialogTitle>
          <DialogDescription>
            {currentPlanId ? 'Switch to a different plan for your community.' : 'Pick a plan to get started.'}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(plans ?? []).map((plan) => {
              const selected = selectedId === plan.id
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedId(plan.id)}
                  className={cn(
                    'flex w-full items-start justify-between gap-3 rounded-lg border p-4 text-left transition-colors',
                    selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {plan.name}
                      {currentPlanId === plan.id ? (
                        <Badge className="ml-2" variant="secondary">Current</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(plan.price)}
                      <span className="font-normal text-muted-foreground">
                        /{plan.billingCycle === 'YEARLY' ? 'year' : 'month'}
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                    )}
                  >
                    {selected ? <Check className="h-3 w-3" /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        <DialogFooter>
          <Button
            disabled={!selectedId || selectedId === currentPlanId || subscribe.isPending}
            onClick={() => {
              if (selectedId) {
                subscribe.mutate(selectedId, {
                  onSuccess: () => setOpen(false),
                })
              }
            }}
          >
            {subscribe.isPending ? 'Applying…' : currentPlanId ? 'Switch plan' : 'Start plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function BillingPage() {
  const { data: summary, isLoading: summaryLoading } = useBillingSummary()
  const { data: limits, isLoading: limitsLoading } = useBillingLimits()
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()
  const renew = useRenewSubscription()
  const cancel = useCancelSubscription()
  const hasManage = useHasPermission(PERMISSIONS.subscriptionManage)
  const outstanding = summary?.invoices.outstandingAmount
  const hasOutstanding = Number(outstanding ?? 0) > 0

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Manage your subscription, usage, and invoices." />

      {summary?.subscription?.status === 'TRIAL' && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Trial period</AlertTitle>
          <AlertDescription>
            Your trial is active until {formatDate(summary.subscription.endsAt)}. Choose a paid plan before it ends to keep the community online.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Plan"
          value={undefined}
          icon={CreditCard}
          hint={summary?.subscription?.plan?.name ?? 'No active plan'}
          loading={summaryLoading}
          className={summary?.subscription?.plan ? undefined : 'border-destructive/40'}
        />
        <KpiCard
          label="Plan cost"
          value={Number(summary?.subscription?.plan?.price ?? 0)}
          icon={Banknote}
          hint={summary?.subscription?.plan?.billingCycle === 'YEARLY' ? 'billed yearly' : 'billed monthly'}
          loading={summaryLoading}
        />
        <KpiCard
          label="Outstanding balance"
          value={Number(summary?.invoices.outstandingAmount ?? 0)}
          icon={AlertTriangle}
          hint="Issued & overdue"
          loading={summaryLoading}
          className={hasOutstanding ? 'border-warning/50' : undefined}
        />
        <KpiCard
          label="Invoices"
          value={summary?.invoices.total ?? 0}
          icon={Building2}
          hint={`${summary?.invoices.expiringWithin30Days ?? 0} expiring in 30 days`}
          loading={summaryLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Your current plan and renewal.</CardDescription>
            </div>
            {hasManage && subscription?.status !== 'CANCELLED' && (
              <PlanSelectDialog currentPlanId={subscription?.planId ?? null} />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : subscription ? (
              <>
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-4">
                  <div>
                    <p className="text-sm font-medium">{subscription.plan?.name ?? 'No plan'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(subscription.startsAt)} — {formatDate(subscription.endsAt)}
                    </p>
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Billing cycle</p>
                    <p className="mt-1 text-sm font-medium">
                      {subscription.plan?.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Auto-renew</p>
                    <p className="mt-1 text-sm font-medium">{subscription.autoRenew ? 'On' : 'Off'}</p>
                  </div>
                </div>
                {hasManage && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={renew.isPending} onClick={() => renew.mutate(subscription.id)}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Renew now
                    </Button>
                    {subscription.status !== 'CANCELLED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        disabled={cancel.isPending}
                        onClick={() => {
                          if (confirm('Cancel this subscription? The community may lose access when it expires.')) {
                            cancel.mutate(subscription.id)
                          }
                        }}
                      >
                        Cancel subscription
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No active subscription yet.</p>
                {hasManage && (
                  <div className="mt-4">
                    <PlanSelectDialog currentPlanId={null} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage & limits</CardTitle>
            <CardDescription>How much of your plan you&apos;re using.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <UsageMeter
              label="Users"
              used={limits?.usage.users ?? 0}
              limit={limits?.limits.users ?? 0}
              exceeded={limits?.exceeded.users ?? false}
              loading={limitsLoading}
            />
            <UsageMeter
              label="Residents"
              used={limits?.usage.residents ?? 0}
              limit={limits?.limits.residents ?? 0}
              exceeded={limits?.exceeded.residents ?? false}
              loading={limitsLoading}
            />
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>{limits?.plan?.name ?? 'No plan'} · {limits?.status ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Subscription invoices for your community.</CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell><StatusBadge status={invoice.status} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(invoice.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No invoices yet. Invoices appear when your subscription renews.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

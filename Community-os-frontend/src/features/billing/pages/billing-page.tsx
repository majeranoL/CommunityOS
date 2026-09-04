import { useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Building2,
  Check,
  CreditCard,
  RefreshCcw,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { ActivePaymentMethods } from '@/features/finance/components/payment-methods-manager'
import {
  useBillingSummary,
  useCancelSubscription,
  useInvoices,
  useInvoiceCheckout,
  useMarkInvoicePaid,
  usePlansList,
  usePlatformPaymentMethods,
  useRenewSubscription,
  useSubscribeToPlan,
  useSubscription,
} from '@/features/billing/hooks/use-billing'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Invoice } from '@/types/api'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'GCASH', label: 'GCash' },
  { value: 'MAYA', label: 'Maya' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
] as const

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
            {currentPlanId
              ? 'Switch to a different plan for your community.'
              : 'Pick a plan to get started.'}
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
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {plan.name}
                      {currentPlanId === plan.id ? (
                        <Badge className="ml-2" variant="secondary">
                          Current
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {plan.description}
                    </p>
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
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border',
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
            disabled={
              !selectedId || selectedId === currentPlanId || subscribe.isPending
            }
            onClick={() => {
              if (selectedId) {
                subscribe.mutate(selectedId, {
                  onSuccess: () => setOpen(false),
                })
              }
            }}
          >
            {subscribe.isPending
              ? 'Applying…'
              : currentPlanId
                ? 'Switch plan'
                : 'Start plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PayInvoiceDialog({ invoice }: { invoice: Invoice }) {
  const checkout = useInvoiceCheckout()
  const markPaid = useMarkInvoicePaid()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('')
  const [showManual, setShowManual] = useState(false)

  const processing = invoice.status === 'PROCESSING'
  const resumeUrl = invoice.checkoutUrl

  const handleOnlinePay = () => {
    if (resumeUrl) {
      window.open(resumeUrl, '_blank', 'noopener,noreferrer')
      return
    }
    checkout.mutate(invoice.id, {
      onSuccess: (result) => {
        window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer')
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setShowManual(false)
          setMethod('')
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Wallet className="mr-2 h-4 w-4" />
          Pay now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay invoice {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Amount due: <strong>{formatCurrency(invoice.amount)}</strong>. Complete your
            payment online, or confirm a manual GCash / Maya / bank transfer below.
          </DialogDescription>
        </DialogHeader>

        {(processing || checkout.isPending) ? (
          <Alert variant="info">
            <RefreshCcw className="h-4 w-4" />
            <AlertTitle>{processing ? 'Payment in progress' : 'Starting payment…'}</AlertTitle>
            <AlertDescription>
              {processing
                ? 'A checkout session is already open for this invoice. Resume it to complete your payment.'
                : 'You will be redirected to our secure payment page.'}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleOnlinePay}
            disabled={checkout.isPending}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {resumeUrl
              ? 'Resume online payment'
              : 'Pay online with GCash / Maya / Card'}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowManual((value) => !value)}
          >
            {showManual
              ? 'Hide manual payment'
              : 'I already paid via GCash / Maya / Bank'}
          </Button>

          {showManual ? (
            <div className="space-y-3 rounded-lg border p-4">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full"
                variant="outline"
                disabled={!method || markPaid.isPending}
                onClick={() => {
                  markPaid.mutate(
                    { id: invoice.id, paymentMethod: method },
                    { onSuccess: () => setOpen(false) },
                  )
                }}
              >
                {markPaid.isPending ? 'Confirming…' : 'Confirm manual payment'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Once confirmed, this payment is recorded as an expense in your
                community finances.
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function BillingPage() {
  const { data: summary, isLoading: summaryLoading } = useBillingSummary()
  const { data: subscription, isLoading: subscriptionLoading } =
    useSubscription()
  const { data: invoices, isLoading: invoicesLoading } = useInvoices()
  const renew = useRenewSubscription()
  const cancel = useCancelSubscription()
  const hasManage = useHasPermission(PERMISSIONS.subscriptionManage)
  const outstanding = summary?.invoices.outstandingAmount
  const hasOutstanding = Number(outstanding ?? 0) > 0
  const { data: platformMethods, isLoading: platformMethodsLoading } =
    usePlatformPaymentMethods()
  const unpaidInvoices = invoices?.filter(
    (inv) => inv.status !== 'PAID' && inv.status !== 'VOID' && inv.status !== 'WAIVED',
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription, usage, and invoices."
      />

      {summary?.subscription?.status === 'TRIAL' && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Trial period</AlertTitle>
          <AlertDescription>
            Your trial is active until {formatDate(summary.subscription.endsAt)}
            . Choose a paid plan before it ends to keep the community online.
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
          className={
            summary?.subscription?.plan ? undefined : 'border-destructive/40'
          }
        />
        <KpiCard
          label="Plan cost"
          value={Number(summary?.subscription?.plan?.price ?? 0)}
          icon={Banknote}
          hint={
            summary?.subscription?.plan?.billingCycle === 'YEARLY'
              ? 'billed yearly'
              : 'billed monthly'
          }
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

      {unpaidInvoices && unpaidInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              How to pay
            </CardTitle>
            <CardDescription>
              You can pay instantly online with a card or e-wallet from the invoice
              row (Pay now) — or send your subscription payment using one of the
              methods below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {platformMethodsLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <ActivePaymentMethods methods={platformMethods} />
            )}
          </CardContent>
        </Card>
      )}

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
                    <p className="text-sm font-medium">
                      {subscription.plan?.name ?? 'No plan'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(subscription.startsAt)} —{' '}
                      {formatDate(subscription.endsAt)}
                    </p>
                  </div>
                  <StatusBadge status={subscription.status} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Billing cycle
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {subscription.plan?.billingCycle === 'YEARLY'
                        ? 'Yearly'
                        : 'Monthly'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">Auto-renew</p>
                    <p className="mt-1 text-sm font-medium">
                      {subscription.autoRenew ? 'On' : 'Off'}
                    </p>
                  </div>
                </div>
                {hasManage && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={renew.isPending}
                      onClick={() => renew.mutate(subscription.id)}
                    >
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
                          if (
                            confirm(
                              'Cancel this subscription? The community may lose access when it expires.',
                            )
                          ) {
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
                <p className="text-sm text-muted-foreground">
                  No active subscription yet.
                </p>
                {hasManage && (
                  <div className="mt-4">
                    <PlanSelectDialog currentPlanId={null} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Included features</CardTitle>
          <CardDescription>
            Modules included in your current plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : subscription?.plan?.includesAllFeatures ? (
            <div className="rounded-lg border bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">
                    All features included in your plan
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every current and future module is available on your
                    community.
                  </p>
                </div>
              </div>
            </div>
          ) : subscription?.plan?.planFeatures?.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {subscription.plan.planFeatures.map(({ feature }) => (
                <div
                  key={feature.id}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {feature.name}
                    </p>
                    <Badge
                      variant={
                        feature.type === 'STANDARD' ? 'secondary' : 'warning'
                      }
                      className="mt-0.5"
                    >
                      {feature.type === 'STANDARD' ? 'Standard' : 'Add-on'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No features included in your current plan.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            Subscription invoices for your community.
          </CardDescription>
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const isPayable =
                    invoice.status !== 'PAID' &&
                    invoice.status !== 'VOID' &&
                    invoice.status !== 'WAIVED'

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPayable ? <PayInvoiceDialog invoice={invoice} /> : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
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

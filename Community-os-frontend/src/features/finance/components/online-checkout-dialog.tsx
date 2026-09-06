import { useMemo, useState } from 'react'
import { CreditCard, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuthStore } from '@/store/auth-store'
import {
  useAssessments,
  useBillingPeriods,
  useChargeTypes,
  usePaymentCheckout,
} from '@/features/finance/hooks/use-finance'
import { useGatewayStatus } from '@/features/billing/hooks/use-billing'
import type { PaymentCheckoutInput } from '@/features/finance/types/finance'
import { formatCurrency } from '@/lib/format'

interface OnlineCheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string | null
}

interface PayableItem {
  key: string
  kind: 'assessment' | 'billing-period'
  id: string
  label: string
  amount: number
}

const PAYABLE_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'])

export function OnlineCheckoutDialog({
  open,
  onOpenChange,
  householdId,
}: OnlineCheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <OnlineCheckoutDialogContent
          householdId={householdId}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </Dialog>
  )
}

function OnlineCheckoutDialogContent({
  householdId,
  onOpenChange,
}: {
  householdId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const user = useAuthStore((s) => s.user)
  const residentId = user?.resident?.id ?? null
  const checkout = usePaymentCheckout()
  const gatewayStatus = useGatewayStatus()
  const onlineEnabled = gatewayStatus.data?.configured ?? true

  const { data: assessmentData, isLoading: assessmentsLoading } = useAssessments({
    page: 1,
    limit: 100,
    ...(householdId ? { householdId } : {}),
  })
  const { data: periodData, isLoading: periodsLoading } = useBillingPeriods({
    page: 1,
    limit: 100,
  })
  const { data: chargeTypeData, isLoading: chargeTypesLoading } = useChargeTypes({
    page: 1,
    limit: 100,
  })

  const [selected, setSelected] = useState<Set<string>>(new Set())

  const advanceChargeTypes = useMemo(() => {
    const set = new Set<string>()
    for (const chargeType of chargeTypeData?.items ?? []) {
      if (chargeType.isActive && chargeType.allowAdvancePayment) {
        set.add(chargeType.id)
      }
    }
    return set
  }, [chargeTypeData])

  const items = useMemo<PayableItem[]>(() => {
    const assessmentItems: PayableItem[] = (assessmentData?.items ?? [])
      .filter((assessment) => PAYABLE_STATUSES.has(assessment.status))
      .map((assessment) => ({
        key: `assessment:${assessment.id}`,
        kind: 'assessment' as const,
        id: assessment.id,
        label: `${assessment.assessmentNumber} · ${assessment.title}`,
        amount: Math.max(
          Number(assessment.amount) - Number(assessment.paidAmount ?? 0),
          0,
        ),
      }))
      .filter((item) => item.amount > 0)

    const periodItems: PayableItem[] = (periodData?.items ?? [])
      .filter(
        (period) =>
          period.status === 'OPEN' &&
          advanceChargeTypes.has(period.chargeType.id),
      )
      .map((period) => ({
        key: `period:${period.id}`,
        kind: 'billing-period' as const,
        id: period.id,
        label: `${period.label} (advance)`,
        amount: Number(period.amount),
      }))

    return [...assessmentItems, ...periodItems]
  }, [assessmentData, periodData, advanceChargeTypes])

  const selectedItems = items.filter((item) => selected.has(item.key))
  const totalAmount = selectedItems.reduce((sum, item) => sum + item.amount, 0)

  const loading =
    assessmentsLoading || periodsLoading || chargeTypesLoading

  const toggleItem = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handlePay = () => {
    if (!residentId || selectedItems.length === 0) return
    const input: PaymentCheckoutInput = {
      residentId,
      amount: totalAmount,
      allocations: selectedItems
        .filter((item) => item.kind === 'assessment')
        .map((item) => ({ assessmentId: item.id, amount: item.amount })),
      billingPeriodIds: selectedItems
        .filter((item) => item.kind === 'billing-period')
        .map((item) => item.id),
      paymentDate: new Date().toISOString(),
    }
    checkout.mutate(input, {
      onSuccess: (result) => {
        onOpenChange(false)
        if (result?.checkoutUrl) {
          window.open(result.checkoutUrl, '_blank', 'noopener,noreferrer')
        }
      },
    })
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Pay dues online</DialogTitle>
        <DialogDescription>
          Pay with GCash, Maya, or card on our secure payment page. The amount is
          calculated from the items you select — no need to type an amount.
        </DialogDescription>
      </DialogHeader>

      {!onlineEnabled ? (
        <Alert variant="warning">
          <Info className="h-4 w-4" />
          <AlertTitle>Online payments unavailable</AlertTitle>
          <AlertDescription>
            The online payment gateway isn&apos;t configured yet. Use the manual
            payment form instead, or contact your administrator.
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your unpaid dues…
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Checkbox
                  checked={selected.has(item.key)}
                  onCheckedChange={() => toggleItem(item.key)}
                />
                <span>{item.label}</span>
              </span>
              <span className="font-medium">{formatCurrency(item.amount)}</span>
            </label>
          ))}
          {items.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No outstanding dues or advance billing periods found for your
              household.
            </p>
          ) : null}
        </div>
      )}

      {items.some((item) => item.kind === 'billing-period') ? (
        <p className="text-xs text-muted-foreground">
          Items marked (advance) cover an open billing period ahead of schedule.
        </p>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total selected</span>
        <span className="font-semibold">{formatCurrency(totalAmount)}</span>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={checkout.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handlePay}
          disabled={
            !onlineEnabled ||
            checkout.isPending ||
            selectedItems.length === 0 ||
            !residentId
          }
        >
          {checkout.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing payment…
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay with GCash / Maya / Card
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
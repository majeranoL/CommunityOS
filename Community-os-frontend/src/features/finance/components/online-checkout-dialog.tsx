import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  CreditCard,
  Info,
  Loader2,
  Upload,
  Wallet,
  X,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore, useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useIsFeatureEnabled } from '@/features/features/hooks/use-enabled-features'
import {
  useApplyHouseholdCredit,
  useAssessments,
  useBillingPeriods,
  useChargeTypes,
  useCreatePayment,
  useHouseholdCredits,
  useMyHouseholdCredits,
} from '@/features/finance/hooks/use-finance'
import { useGatewayStatus } from '@/features/billing/hooks/use-billing'
import { paymentMethodsService, paymentsService } from '@/features/finance/services/finance'
import { documentsService } from '@/features/documents/services/documents'
import { ActivePaymentMethods } from '@/features/finance/components/payment-methods-manager'
import { PaymentReceiptDialog } from '@/features/finance/components/payment-receipt-dialog'
import type {
  CreatePaymentInput,
  PaymentCheckoutInput,
  PaymentMethod,
} from '@/features/finance/types/finance'
import { toast } from '@/components/ui/sonner'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

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

const METHOD_LABELS: Record<string, string> = {
  GCASH: 'GCash',
  MAYA: 'Maya',
  BANK_TRANSFER: 'Bank transfer',
}

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
  const gatewayStatus = useGatewayStatus()
  const onlineEnabled = gatewayStatus.data?.configured ?? true

  const [mode, setMode] = useState<'qr-bank' | 'online'>('qr-bank')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [method, setMethod] = useState<PaymentMethod>('GCASH')
  const [reference, setReference] = useState('')
  const [uploading, setUploading] = useState(false)
  const [proof, setProof] = useState<{
    fileId: string
    url: string
    name: string
  } | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [applyCredit, setApplyCredit] = useState(true)

  const createPayment = useCreatePayment()
  const applyCreditMutation = useApplyHouseholdCredit()
  const creditsEnabled = useIsFeatureEnabled('household-credit')
  const canViewCredits = useHasPermission(PERMISSIONS.creditView)
  const { data: myCredits } = useMyHouseholdCredits({
    enabled: creditsEnabled && !canViewCredits,
  })
  const { data: householdCredits } = useHouseholdCredits(
    { householdId: householdId ?? undefined },
    { enabled: creditsEnabled && canViewCredits && Boolean(householdId) },
  )

  const availableCredit = canViewCredits
    ? (householdCredits ?? []).reduce(
        (sum, credit) =>
          Number(credit.balance) > 0 ? sum + Number(credit.balance) : sum,
        0,
      )
    : myCredits?.availableBalance ?? 0

  const { data: activeMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ['payment-methods', 'active'],
    queryFn: () => paymentMethodsService.listActive(),
  })

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

  // Household credit only ever covers assessments (advance billing-period
  // items are excluded), and only when the feature is enabled.
  const canUseCredit =
    creditsEnabled && selectedItems.every((item) => item.kind === 'assessment')
  const effectiveApplyCredit = canUseCredit && applyCredit
  const creditApplied = effectiveApplyCredit
    ? Math.min(availableCredit, totalAmount)
    : 0
  const payable = Math.max(totalAmount - creditApplied, 0)
  const settleByCredit =
    effectiveApplyCredit && selectedItems.length > 0 && payable <= 0.005

  const loading =
    assessmentsLoading || periodsLoading || chargeTypesLoading

  const allowedMethods = useMemo(
    () => (activeMethods ?? []).map((m) => m.method),
    [activeMethods],
  )

  // Fall back to the first configured method if the current selection is no
  // longer active.
  const effectiveMethod: PaymentMethod =
    (allowedMethods as PaymentMethod[]).includes(method) ||
    allowedMethods.length === 0
      ? method
      : (allowedMethods[0] as PaymentMethod)

  const needsProof = effectiveMethod === 'GCASH' || effectiveMethod === 'MAYA'
  const hasItems = selectedItems.length > 0
  const canSubmitManual =
    hasItems &&
    payable > 0.005 &&
    !applyCreditMutation.isPending &&
    effectiveMethod !== null &&
    (!needsProof || Boolean(proof)) &&
    !uploading &&
    !createPayment.isPending

  const toggleItem = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleProofUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    setUploading(true)
    try {
      const result = await documentsService.upload(file)
      setProof({
        fileId: result.id,
        url: result.url,
        name: result.originalName,
      })
    } catch {
      toast.error('Failed to upload proof.')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitManual = () => {
    if (!residentId || !effectiveMethod) return

    const input: CreatePaymentInput = {
      residentId,
      amount: payable,
      paymentDate: new Date().toISOString(),
      method: effectiveMethod,
      referenceNumber: reference.trim() || undefined,
      proofFileId: proof?.fileId,
      proofUrl: proof?.url,
      allocations: selectedItems
        .filter((item) => item.kind === 'assessment')
        .map((item) => ({ assessmentId: item.id, amount: item.amount })),
      billingPeriodIds: selectedItems
        .filter((item) => item.kind === 'billing-period')
        .map((item) => item.id),
      applyCredit: effectiveApplyCredit || undefined,
    }

    createPayment.mutate(input, {
      onSuccess: (createdPayment) => {
        onOpenChange(false)
        setReference('')
        setProof(null)
        setSelected(new Set())
        if (createdPayment?.id) {
          setReceiptId(createdPayment.id)
          toast.success('Payment recorded and awaiting verification.', {
            action: {
              label: 'View receipt',
              onClick: () => setReceiptOpen(true),
            },
          })
        } else {
          toast.success('Payment recorded and awaiting verification.')
        }
      },
    })
  }

  const handleSettleByCredit = () => {
    if (!householdId || settleByCredit === false) return
    applyCreditMutation.mutate(
      {
        householdId,
        allocations: selectedItems.map((item) => ({
          assessmentId: item.id,
          amount: item.amount,
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setSelected(new Set())
          toast.success('Your household credit was applied to these items.')
        },
      },
    )
  }

  const handlePayOnline = () => {
    if (!residentId || selectedItems.length === 0) return
    // Reserve a tab during the click gesture; navigating after the API call
    // would otherwise be treated as a blocked popup by the browser.
    const checkoutWindow = window.open('', '_blank')
    if (checkoutWindow) checkoutWindow.opener = null

    const input: PaymentCheckoutInput = {
      residentId,
      amount: payable,
      allocations: selectedItems
        .filter((item) => item.kind === 'assessment')
        .map((item) => ({ assessmentId: item.id, amount: item.amount })),
      billingPeriodIds: selectedItems
        .filter((item) => item.kind === 'billing-period')
        .map((item) => item.id),
      paymentDate: new Date().toISOString(),
      applyCredit: effectiveApplyCredit || undefined,
    }
    paymentsService
      .checkout(input)
      .then((result) => {
        onOpenChange(false)
        if (result?.checkoutUrl) {
          if (checkoutWindow && !checkoutWindow.closed) {
            checkoutWindow.location.href = result.checkoutUrl
          } else {
            window.location.assign(result.checkoutUrl)
          }
        }
      })
      .catch(() => {
        toast.error('Failed to start online payment.')
        if (checkoutWindow && !checkoutWindow.closed) checkoutWindow.close()
      })
  }

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Pay dues</DialogTitle>
        <DialogDescription>
          Pay with the QR / bank transfer methods below, or pay online with
          GCash / Maya / card. The amount is calculated from the items you
          select.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
        <Button
          type="button"
          variant={mode === 'qr-bank' ? 'default' : 'ghost'}
          className="justify-center"
          onClick={() => setMode('qr-bank')}
        >
          <Wallet className="mr-2 h-4 w-4" />
          QR / Bank transfer
        </Button>
        <Button
          type="button"
          variant={mode === 'online' ? 'default' : 'ghost'}
          className="justify-center"
          onClick={() => setMode('online')}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Pay online
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your unpaid dues…
        </div>
      ) : (
        <>
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
                <span className="font-medium">
                  {formatCurrency(item.amount)}
                </span>
              </label>
            ))}
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No outstanding dues or advance billing periods found for your
                household.
              </p>
            ) : null}
          </div>

          {items.some((item) => item.kind === 'billing-period') ? (
            <p className="text-xs text-muted-foreground">
              Items marked (advance) cover an open billing period ahead of
              schedule.
            </p>
          ) : null}
        </>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Total selected</span>
        <span className="font-semibold">{formatCurrency(totalAmount)}</span>
      </div>

      {creditsEnabled && hasItems && canUseCredit ? (
        <div className="space-y-2 rounded-lg border p-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={applyCredit}
              onCheckedChange={(checked) => setApplyCredit(checked === true)}
            />
            Apply household credit (
            {formatCurrency(availableCredit)} available)
          </label>
          {creditApplied > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Credit applied</span>
              <span className="font-medium text-emerald-600">
                −{formatCurrency(creditApplied)}
              </span>
            </div>
          ) : null}
          {creditApplied > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">You&apos;ll pay</span>
              <span className="font-semibold">{formatCurrency(payable)}</span>
            </div>
          ) : null}
          {!applyCredit && availableCredit > 0 ? (
            <p className="text-xs text-muted-foreground">
              Your household credit will not be applied to these items.
            </p>
          ) : null}
        </div>
      ) : null}
      {creditsEnabled && hasItems && !canUseCredit ? (
        <p className="text-xs text-muted-foreground">
          Household credit can&apos;t be applied while an advance billing
          period is selected.
        </p>
      ) : null}

      {mode === 'qr-bank' ? (
        <div className="space-y-3 rounded-lg border p-4">
          {methodsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payment methods…
            </div>
          ) : activeMethods?.length ? (
            <>
              <ActivePaymentMethods methods={activeMethods} />
              <div className="space-y-3 pt-1">
                <div className="grid gap-2">
                  <Label>How did you pay?</Label>
                  <Select
                    value={effectiveMethod}
                    onValueChange={(value) => setMethod(value as PaymentMethod)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select method used" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMethods.map((m) => (
                        <SelectItem key={m.method} value={m.method}>
                          {METHOD_LABELS[m.method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reference">
                    Reference number{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="reference"
                    placeholder="e.g. GCash receipt no."
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Proof of payment</Label>
                  {proof ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                      <span className="truncate text-muted-foreground">
                        <Upload className="mr-1 inline h-4 w-4" />
                        {proof.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setProof(null)}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Remove proof</span>
                      </Button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {uploading ? 'Uploading…' : 'Upload receipt or screenshot'}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="sr-only"
                        onChange={handleProofUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                  {needsProof && !proof ? (
                    <p className="text-xs text-muted-foreground">
                      A screenshot proof is required for wallet payments so an
                      officer can verify your transfer.
                    </p>
                  ) : null}
                </div>

                {settleByCredit ? (
                  <Button
                    className="w-full"
                    onClick={handleSettleByCredit}
                    disabled={applyCreditMutation.isPending}
                  >
                    {applyCreditMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Applying credit…
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4" />
                        Settle with household credit
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={handleSubmitManual}
                    disabled={!canSubmitManual}
                  >
                    {createPayment.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        I&apos;ve paid — submit for verification
                      </>
                    )}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  An officer will confirm your transfer, then your dues will be
                  marked as paid.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No QR / bank transfer payment methods are configured for your
              community yet. Use &ldquo;Pay online&rdquo; or the &ldquo;Pay
              now&rdquo; form instead, or ask an officer to add payment methods.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border p-4">
          {settleByCredit ? (
            <Button
              className="w-full"
              onClick={handleSettleByCredit}
              disabled={applyCreditMutation.isPending}
            >
              {applyCreditMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying credit…
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Settle with household credit
                </>
              )}
            </Button>
          ) : !onlineEnabled ? (
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Online payments unavailable</AlertTitle>
              <AlertDescription>
                The online payment gateway isn&apos;t configured yet. Use the
                QR / bank transfer method instead, or contact an administrator.
              </AlertDescription>
            </Alert>
          ) : (
            <Button
              className="w-full"
              onClick={handlePayOnline}
              disabled={!hasItems || !residentId}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pay with GCash / Maya / Card (PayMongo)
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            You&apos;ll be redirected to our secure payment page. If you close
            it without paying, this checkout is automatically cancelled.
          </p>
        </div>
      )}

      <DialogFooter className={cn(mode === 'qr-bank' && 'justify-start')}>
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={uploading || createPayment.isPending || applyCreditMutation.isPending}
        >
          Cancel
        </Button>
      </DialogFooter>

      <PaymentReceiptDialog
        paymentId={receiptId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </DialogContent>
  )
}
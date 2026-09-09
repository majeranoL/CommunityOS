import { useState } from 'react'
import { CheckCircle2, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { HouseholdSelect } from '@/features/finance/components/household-select'
import {
  useAdjustHouseholdCredit,
  useApplyHouseholdCredit,
  useAssessments,
  useHouseholdCredits,
  useIssueHouseholdCredit,
  useVoidHouseholdCredit,
} from '@/features/finance/hooks/use-finance'
import type { HouseholdCredit } from '@/features/finance/types/finance'
import { formatCurrency, formatDateTime } from '@/lib/format'

function creditAvailable(credit: HouseholdCredit) {
  return Math.max(Number(credit.balance), 0)
}

function creditOrigin(credit: HouseholdCredit) {
  if (credit.request) return `Request ${credit.request.requestNumber}`
  if (credit.sourcePayment) {
    return credit.sourcePayment.isCreditIssue
      ? `Credit issue ${credit.sourcePayment.paymentNumber}`
      : 'Advance / refund'
  }
  return 'Manual'
}

export function HouseholdCreditsTab() {
  const { data: credits, isLoading } = useHouseholdCredits({})

  const totalAvailable = (credits ?? []).reduce(
    (sum, credit) => sum + creditAvailable(credit),
    0,
  )

  const [issueOpen, setIssueOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<HouseholdCredit | null>(null)
  const [voidTarget, setVoidTarget] = useState<HouseholdCredit | null>(null)
  const [applyTarget, setApplyTarget] = useState<HouseholdCredit | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Total available credit</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {formatCurrency(totalAvailable)}
          </p>
        </div>
        <Button size="sm" onClick={() => setIssueOpen(true)}>
          <Plus className="h-4 w-4" />
          Issue credit
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading household credits…
        </div>
      ) : credits && credits.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Household</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.map((credit) => (
                <TableRow key={credit.id}>
                  <TableCell>
                    <span className="font-medium">{credit.household.address}</span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        creditAvailable(credit) > 0
                          ? 'font-medium'
                          : 'text-muted-foreground'
                      }
                    >
                      {formatCurrency(creditAvailable(credit))}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {creditOrigin(credit)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(credit.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAdjustTarget(credit)}
                      >
                        Adjust
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setApplyTarget(credit)}
                      >
                        Apply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setVoidTarget(credit)}
                      >
                        Void
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          No household credits have been issued yet. Use &ldquo;Issue credit&rdquo;
          to grant credit to a household, or issue a credit for a construction
          request refund.
        </p>
      )}

      <IssueCreditDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <AdjustCreditDialog
        credit={adjustTarget}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null)
        }}
      />
      <VoidCreditDialog
        credit={voidTarget}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null)
        }}
      />
      <ApplyCreditDialog
        credit={applyTarget}
        onOpenChange={(open) => {
          if (!open) setApplyTarget(null)
        }}
      />
    </div>
  )
}

function IssueCreditDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [householdId, setHouseholdId] = useState('')
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [reason, setReason] = useState('')
  const issue = useIssueHouseholdCredit()

  const canSubmit = Boolean(householdId) && Boolean(amount) && (amount ?? 0) > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Issue household credit</DialogTitle>
            <DialogDescription>
              Grant credit to a household. It will be automatically applied
              toward future dues when the resident pays.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Household</Label>
              <HouseholdSelect
                value={householdId}
                onChange={setHouseholdId}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount ?? ''}
                onChange={(event) => setAmount(event.target.valueAsNumber)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. Refund for cancelled assessment"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={issue.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                issue.mutate(
                  {
                    householdId,
                    amount: amount ?? 0,
                    reason: reason.trim() || undefined,
                  },
                  {
                    onSuccess: () => {
                      onOpenChange(false)
                      setHouseholdId('')
                      setAmount(undefined)
                      setReason('')
                    },
                  },
                )
              }
              disabled={!canSubmit || issue.isPending}
            >
              {issue.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Issuing…
                </>
              ) : (
                'Issue credit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function AdjustCreditDialog({
  credit,
  onOpenChange,
}: {
  credit: HouseholdCredit | null
  onOpenChange: (open: boolean) => void
}) {
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const adjust = useAdjustHouseholdCredit()

  const open = Boolean(credit)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && credit ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust credit balance</DialogTitle>
            <DialogDescription>
              Set the new available balance for this household&apos;s credit.
              The record is kept, so this shows as an adjustment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-balance">
              New balance (currently {formatCurrency(creditAvailable(credit))})
            </Label>
            <Input
              id="new-balance"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount ?? ''}
              onChange={(event) => setAmount(event.target.valueAsNumber)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjust.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                adjust.mutate(
                  { id: credit.id, amount: amount ?? 0 },
                  {
                    onSuccess: () => onOpenChange(false),
                  },
                )
              }
              disabled={amount === undefined || adjust.isPending}
            >
              {adjust.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function VoidCreditDialog({
  credit,
  onOpenChange,
}: {
  credit: HouseholdCredit | null
  onOpenChange: (open: boolean) => void
}) {
  const voidCredit = useVoidHouseholdCredit()

  return (
    <ConfirmDialog
      open={Boolean(credit)}
      onOpenChange={onOpenChange}
      title="Void household credit?"
      description={
        credit
          ? `This zeroes the ${formatCurrency(creditAvailable(credit))} balance and reverses any credit already applied to assessments for this household. This can't be undone.`
          : ''
      }
      confirmLabel="Void credit"
      loading={voidCredit.isPending}
      onConfirm={() => {
        if (credit) voidCredit.mutate(credit.id, { onSuccess: () => onOpenChange(false) })
      }}
    />
  )
}

const APPLYABLE_STATUSES = new Set(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'])

function ApplyCreditDialog({
  credit,
  onOpenChange,
}: {
  credit: HouseholdCredit | null
  onOpenChange: (open: boolean) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const apply = useApplyHouseholdCredit()

  const open = Boolean(credit)
  const householdId = credit?.householdId ?? ''

  const { data: assessmentData, isLoading: assessmentsLoading } = useAssessments({
    page: 1,
    limit: 100,
    ...(householdId ? { householdId } : {}),
  })

  const assessments = (assessmentData?.items ?? []).filter((assessment) =>
    APPLYABLE_STATUSES.has(assessment.status),
  )

  const toggleItem = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply household credit</DialogTitle>
            <DialogDescription>
              Settle outstanding assessments for this household using its
              available credit — no cash moves.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {assessmentsLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading assessments…
              </div>
            ) : assessments.length > 0 ? (
              assessments.map((assessment) => (
                <label
                  key={assessment.id}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={selected.has(assessment.id)}
                      onChange={() => toggleItem(assessment.id)}
                    />
                    <span>
                      {assessment.assessmentNumber} · {assessment.title}
                    </span>
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      Math.max(
                        Number(assessment.amount) -
                          Number(assessment.paidAmount ?? 0),
                        0,
                      ),
                    )}
                  </span>
                </label>
              ))
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No outstanding assessments for this household.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!credit) return
                apply.mutate(
                  {
                    householdId: credit.householdId,
                    allocations: assessments
                      .filter((assessment) => selected.has(assessment.id))
                      .map((assessment) => ({ assessmentId: assessment.id })),
                  },
                  {
                    onSuccess: () => {
                      onOpenChange(false)
                      setSelected(new Set())
                    },
                  },
                )
              }}
              disabled={selected.size === 0 || apply.isPending}
            >
              {apply.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Applying…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Apply credit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
import { useState } from 'react'
import { Plus, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useAdminCommunities } from '@/features/admin/hooks/use-admin'
import {
  useAdminAdjustHouseholdCredit,
  useAdminHouseholdCredits,
  useAdminHouseholds,
  useAdminIssueHouseholdCredit,
  useAdminVoidHouseholdCredit,
} from '@/features/admin/hooks/use-household-credits'
import { householdUnitLabel } from '@/features/admin/services/household-credits'
import type { HouseholdCredit } from '@/features/finance/types/finance'
import type { HouseholdOption } from '@/features/admin/services/household-credits'
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

export default function AdminHouseholdCreditsPage() {
  const [communityId, setCommunityId] = useState('')
  const { data: communities } = useAdminCommunities({ page: 1, limit: 100 })
  const { data: credits, isLoading } = useAdminHouseholdCredits({
    ...(communityId ? { communityId } : {}),
  })

  const totalAvailable = (credits ?? []).reduce(
    (sum, credit) => sum + creditAvailable(credit),
    0,
  )

  const [issueOpen, setIssueOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<HouseholdCredit | null>(null)
  const [voidTarget, setVoidTarget] = useState<HouseholdCredit | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Household credits"
        description="Review and manage household credits across all communities. Credits auto-apply toward a household's dues when they pay."
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="community-filter">Community</Label>
          <div className="w-72">
            <Select
              value={communityId}
              onValueChange={setCommunityId}
            >
              <SelectTrigger id="community-filter">
                <SelectValue placeholder="All communities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All communities</SelectItem>
                {(communities?.items ?? []).map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
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
                {!communityId ? <TableHead>Community</TableHead> : null}
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
                  {!communityId ? (
                    <TableCell className="text-muted-foreground">
                      {credit.community.displayName}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <span className="font-medium">
                      {householdUnitLabel(credit.household)}
                    </span>
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
          No household credits{' '}
          {communityId ? 'for this community' : 'across communities'} yet.
        </p>
      )}

      <IssueCreditDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        communities={communities?.items ?? []}
      />
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
    </div>
  )
}

function IssueCreditDialog({
  open,
  onOpenChange,
  communities,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  communities: Array<{ id: string; displayName: string }>
}) {
  const [communityId, setCommunityId] = useState('')
  const [householdId, setHouseholdId] = useState('')
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [reason, setReason] = useState('')
  const issue = useAdminIssueHouseholdCredit()
  const { data: households, isLoading: householdsLoading } =
    useAdminHouseholds(communityId)

  const canSubmit =
    Boolean(communityId) &&
    Boolean(householdId) &&
    Boolean(amount) &&
    (amount ?? 0) > 0

  const handleClose = () => {
    setCommunityId('')
    setHouseholdId('')
    setAmount(undefined)
    setReason('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) handleClose()
      }}
    >
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
              <Label>Community</Label>
              <Select value={communityId} onValueChange={setCommunityId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a community" />
                </SelectTrigger>
                <SelectContent>
                  {communities.map((community) => (
                    <SelectItem key={community.id} value={community.id}>
                      {community.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {communityId ? (
              <div className="grid gap-2">
                <Label>Household</Label>
                {householdsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading households…
                  </div>
                ) : (households ?? []).length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-1">
                    {(households ?? []).map((household: HouseholdOption) => (
                      <button
                        key={household.id}
                        type="button"
                        className={
                          'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent' +
                          (householdId === household.id ? ' bg-accent' : '')
                        }
                        onClick={() => setHouseholdId(household.id)}
                      >
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {householdUnitLabel(household)}
                        </span>
                        {householdId === household.id ? (
                          <span className="text-xs text-primary">Selected</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No households in this community.
                  </p>
                )}
              </div>
            ) : null}
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                issue.mutate(
                  {
                    communityId,
                    householdId,
                    amount: amount ?? 0,
                    reason: reason.trim() || undefined,
                  },
                  { onSuccess: () => onOpenChange(false) },
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
  const adjust = useAdminAdjustHouseholdCredit()

  return (
    <Dialog open={Boolean(credit)} onOpenChange={onOpenChange}>
      {credit ? (
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust credit balance</DialogTitle>
            <DialogDescription>
              Set a new balance for {credit.community.displayName} —{' '}
              {householdUnitLabel(credit.household)} (currently{' '}
              {formatCurrency(creditAvailable(credit))}).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-balance">New balance</Label>
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                adjust.mutate(
                  { id: credit.id, amount: amount ?? 0 },
                  { onSuccess: () => onOpenChange(false) },
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
  const voidCredit = useAdminVoidHouseholdCredit()

  return (
    <ConfirmDialog
      open={Boolean(credit)}
      onOpenChange={onOpenChange}
      title="Void household credit?"
      description={
        credit
          ? `This zeroes the ${formatCurrency(creditAvailable(credit))} balance and reverses any credit already applied to assessments. This can't be undone.`
          : ''
      }
      confirmLabel="Void credit"
      loading={voidCredit.isPending}
      onConfirm={() => {
        if (credit) {
          voidCredit.mutate(credit.id, { onSuccess: () => onOpenChange(false) })
        }
      }}
    />
  )
}
import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import { useDuesMonth, useSyncDuesMonthHouseholds } from '@/features/finance/hooks/use-finance'
import { householdLabel } from '@/features/finance/components/household-select'
import { formatCurrency, formatDate } from '@/lib/format'

interface DuesMonthDetailDialogProps {
  periodKey: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DuesMonthDetailDialog({
  periodKey,
  open,
  onOpenChange,
}: DuesMonthDetailDialogProps) {
  const canCreate = useHasPermission(PERMISSIONS.assessmentCreate)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useDuesMonth(open ? periodKey : null)
  const syncHouseholds = useSyncDuesMonthHouseholds()

  const households = data?.households ?? []
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return households
    return households.filter((row) =>
      householdLabel(row).toLowerCase().includes(term),
    )
  }, [households, search])

  const summary = data?.summary

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{summary ? summary.label : 'Monthly dues'}</DialogTitle>
          <DialogDescription>
            Household payment status for this month.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !summary ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span>
                  <span className="font-semibold">
                    {formatCurrency(summary.totalCollected)}
                  </span>{' '}
                  collected of{' '}
                  <span className="font-medium">
                    {formatCurrency(summary.totalExpected)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {summary.perHousehold > 0
                    ? `${formatCurrency(summary.perHousehold)} × ${summary.householdCount} household${summary.householdCount === 1 ? '' : 's'}`
                    : `${summary.householdCount} household${summary.householdCount === 1 ? '' : 's'}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{
                    width: `${
                      summary.totalExpected > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (summary.totalCollected / summary.totalExpected) *
                                100,
                            ),
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="success">{summary.paidCount} paid</Badge>
                {summary.partialCount > 0 ? (
                  <Badge variant="warning">{summary.partialCount} partial</Badge>
                ) : null}
                {summary.unpaidCount > 0 ? (
                  <Badge variant="destructive">
                    {summary.unpaidCount} unpaid
                    {summary.overdueCount > 0
                      ? ` (${summary.overdueCount} overdue)`
                      : ''}
                  </Badge>
                ) : null}
                {summary.waivedCount > 0 ? (
                  <Badge variant="muted">{summary.waivedCount} waived</Badge>
                ) : null}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Search household…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="sm:max-w-xs"
              />
              {canCreate ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="sm:ml-auto"
                  disabled={syncHouseholds.isPending}
                  onClick={() => periodKey && syncHouseholds.mutate(periodKey)}
                >
                  <UserPlus className="h-4 w-4" />
                  Add missing households
                </Button>
              ) : null}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Household</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Last payment
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No bills yet for this month.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => (
                      <TableRow key={row.assessmentId}>
                        <TableCell className="font-medium">
                          {householdLabel(row)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.amountDue)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(row.paidAmount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} />
                        </TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {row.lastPaymentDate
                            ? formatDate(row.lastPaymentDate)
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { FileDown, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/store/auth-store'
import { PERMISSIONS } from '@/constants/permissions'
import {
  useDuesMonths,
} from '@/features/finance/hooks/use-finance'
import { CreateDuesMonthDialog } from '@/features/finance/components/create-dues-month-dialog'
import { DuesMonthDetailDialog } from '@/features/finance/components/dues-month-detail-dialog'
import { ImportExportDialog } from '@/features/finance/components/import-export-dialog'
import { formatCurrency, formatDate } from '@/lib/format'

export function DuesMonthsTab() {
  const canCreate = useHasPermission(PERMISSIONS.assessmentCreate)
  const canImport = useHasPermission(PERMISSIONS.financeImport)
  const canExport = useHasPermission(PERMISSIONS.financeExport)
  const canImportExport = canImport || canExport
  const { data: months, isLoading } = useDuesMonths()

  const [createOpen, setCreateOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [importExportOpen, setImportExportOpen] = useState(false)

  const openDetail = (periodKey: string) => {
    setSelectedPeriod(periodKey)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          One entry per month. Click a month to see which households paid.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {canImportExport ? (
            <Button variant="outline" onClick={() => setImportExportOpen(true)}>
              <FileDown className="h-4 w-4" />
              Import / export
            </Button>
          ) : null}
          {canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New monthly dues
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !months || months.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-medium">No monthly dues yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Create your first month to bill every active household at once.
              You can pick any month — past or current.
            </p>
            {canCreate ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New monthly dues
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {months.map((month) => {
            const percent =
              month.totalExpected > 0
                ? Math.min(
                    100,
                    Math.round(
                      (month.totalCollected / month.totalExpected) * 100,
                    ),
                  )
                : 0
            return (
              <Card key={month.periodKey} className="transition-colors">
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="w-full rounded-lg p-4 text-left hover:bg-muted/50"
                    onClick={() => openDetail(month.periodKey)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{month.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {month.dueDate
                            ? `Due ${formatDate(month.dueDate)} · `
                            : ''}
                          {month.perHousehold > 0
                            ? `${formatCurrency(month.perHousehold)} × ${month.householdCount} household${month.householdCount === 1 ? '' : 's'}`
                            : `${month.householdCount} household${month.householdCount === 1 ? '' : 's'}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(month.totalCollected)}
                          <span className="text-sm font-normal text-muted-foreground">
                            {' '}
                            of {formatCurrency(month.totalExpected)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="success">{month.paidCount} paid</Badge>
                      {month.partialCount > 0 ? (
                        <Badge variant="warning">
                          {month.partialCount} partial
                        </Badge>
                      ) : null}
                      {month.unpaidCount > 0 ? (
                        <Badge variant="destructive">
                          {month.unpaidCount} unpaid
                          {month.overdueCount > 0
                            ? ` · ${month.overdueCount} overdue`
                            : ''}
                        </Badge>
                      ) : null}
                      {month.waivedCount > 0 ? (
                        <Badge variant="muted">{month.waivedCount} waived</Badge>
                      ) : null}
                    </div>
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CreateDuesMonthDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DuesMonthDetailDialog
        periodKey={selectedPeriod}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedPeriod(null)
        }}
      />
      <ImportExportDialog
        open={importExportOpen}
        onOpenChange={setImportExportOpen}
        initialKind="assessments"
      />
    </div>
  )
}

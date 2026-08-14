import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/status-badge'
import {
  buildHouseholdLedger,
  downloadLedgerCsv,
  ledgerFilename,
  ledgerToCsv,
} from '@/features/households/lib/ledger'
import type {
  HouseholdAssessment,
  HouseholdFinanceSummary,
} from '@/features/households/types/household'
import { formatCurrency, formatDate } from '@/lib/format'

interface HouseholdLedgerProps {
  assessments: HouseholdAssessment[]
  finance: HouseholdFinanceSummary | null
  unitLabel: string
}

export function HouseholdLedger({
  assessments,
  finance,
  unitLabel,
}: HouseholdLedgerProps) {
  const entries = buildHouseholdLedger(assessments)

  const handleExport = () => {
    const csv = ledgerToCsv(entries)
    downloadLedgerCsv(csv, ledgerFilename(unitLabel))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              Balance {formatCurrency(finance?.outstanding ?? 0)}
            </Badge>
            {finance?.monthsBehind ? (
              <span className="text-xs text-muted-foreground">
                {finance.monthsBehind} month
                {finance.monthsBehind === 1 ? '' : 's'} behind
              </span>
            ) : null}
          </div>
          {entries.some(
            (entry) => entry.type === 'payment' && entry.status !== 'VERIFIED',
          ) && (
            <p className="mt-1 text-xs text-muted-foreground">
              Pending or rejected payments are shown but not applied to the
              balance.
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={entries.length === 0}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No billing records for this household yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{entry.description}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.number}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.referenceNumber ??
                      (entry.method ? entry.method.replace(/_/g, ' ') : '—')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={entry.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.type === 'assessment'
                      ? formatCurrency(entry.debit)
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.type === 'payment' && entry.credit > 0
                      ? formatCurrency(entry.credit)
                      : '—'}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      entry.balance > 0 ? 'text-destructive' : ''
                    }`}
                  >
                    {formatCurrency(entry.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

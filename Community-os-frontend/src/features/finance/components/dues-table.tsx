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
import { buildDuesRows, duesToCsv } from '@/features/households/lib/dues'
import {
  downloadLedgerCsv,
  ledgerFilename,
} from '@/features/households/lib/ledger'
import type {
  HouseholdAssessment,
  HouseholdFinanceSummary,
} from '@/features/households/types/household'
import { formatCurrency, formatDate } from '@/lib/format'

interface DuesTableProps {
  assessments: HouseholdAssessment[]
  finance: HouseholdFinanceSummary | null
  unitLabel: string
}

export function DuesTable({
  assessments,
  finance,
  unitLabel,
}: DuesTableProps) {
  const rows = buildDuesRows(assessments)

  const handleExport = () => {
    downloadLedgerCsv(duesToCsv(rows), ledgerFilename(unitLabel))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Badge variant="secondary">
            Balance {formatCurrency(finance?.outstanding ?? 0)}
          </Badge>
          {finance?.monthsBehind ? (
            <span className="ml-2 text-xs text-muted-foreground">
              {finance.monthsBehind} month
              {finance.monthsBehind === 1 ? '' : 's'} behind
            </span>
          ) : null}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExport}
          disabled={rows.length === 0}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Each dues line shows what was billed, what you have paid, and the
        remaining balance. Payments are listed separately under My payments.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No dues have been billed to your household yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.title}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.assessmentNumber}
                        {row.period ? ` · ${row.period}` : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.billed)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(row.paid)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      row.balance > 0 ? 'text-destructive' : 'text-success'
                    }`}
                  >
                    {formatCurrency(row.balance)}
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
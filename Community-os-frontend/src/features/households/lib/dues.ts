import type { HouseholdAssessment } from '@/features/households/types/household'
import { csvEscape } from '@/features/households/lib/ledger'

export interface DuesRow {
  id: string
  assessmentNumber: string
  title: string
  period: string | null
  dueDate: string
  status: string
  billed: number
  paid: number
  balance: number
}

const HIDDEN_STATUSES = new Set(['DRAFT', 'CANCELLED'])

function toNumber(value: string | number | null | undefined): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

/**
 * Builds a per-bill dues list from a household's assessments. Unlike the
 * running ledger, each assessment is a single consolidated row
 * (Billed / Paid / Balance), so a paid monthly dues appears once instead of
 * as a bill row plus separate payment rows. DRAFT and CANCELLED assessments
 * are excluded, matching the backend finance summary.
 */
export function buildDuesRows(assessments: HouseholdAssessment[]): DuesRow[] {
  return assessments
    .filter((assessment) => !HIDDEN_STATUSES.has(assessment.status))
    .map((assessment) => {
      const billed = Math.max(
        toNumber(assessment.amount) - toNumber(assessment.discountAmount),
        0,
      )
      const paid = toNumber(assessment.paidAmount)
      const balance = Math.max(billed - paid, 0)

      return {
        id: assessment.id,
        assessmentNumber: assessment.assessmentNumber,
        title: assessment.title,
        period: assessment.period,
        dueDate: assessment.dueDate,
        status: assessment.status,
        billed,
        paid,
        balance,
      }
    })
    .sort((a, b) => {
      const dateDiff =
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      if (dateDiff !== 0) return dateDiff
      return a.assessmentNumber.localeCompare(b.assessmentNumber)
    })
}

export function duesToCsv(rows: DuesRow[]): string {
  const header = [
    'Due date',
    'Description',
    'Number',
    'Period',
    'Status',
    'Billed',
    'Paid',
    'Balance',
  ]
  const body = rows.map((row) =>
    [
      row.dueDate,
      row.title,
      row.assessmentNumber,
      row.period ?? '',
      row.status,
      row.billed.toFixed(2),
      row.paid.toFixed(2),
      row.balance.toFixed(2),
    ]
      .map(csvEscape)
      .join(','),
  )
  return [header.map(csvEscape).join(','), ...body].join('\n')
}
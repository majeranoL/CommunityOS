import type { HouseholdAssessment } from '@/features/households/types/household'

const VERIFIED = 'VERIFIED'

const UNBILLED_STATUSES = new Set(['DRAFT', 'CANCELLED'])

export type LedgerEntryType = 'assessment' | 'payment'

export interface LedgerEntry {
  id: string
  date: string
  type: LedgerEntryType
  description: string
  number: string
  status: string
  method: string | null
  referenceNumber: string | null
  debit: number
  credit: number
  balance: number
}

/**
 * Builds a chronological running-balance ledger from a household's
 * assessments and their nested payments.
 *
 * - Assessments become DEBIT rows (DRAFT/CANCELLED are excluded, matching
 *   the backend finance summary)
 * - VERIFIED payments become CREDIT rows that reduce the balance
 * - PENDING_VERIFICATION/REJECTED/REFUNDED/CANCELLED payments are listed as
 *   informational rows that do NOT affect the running balance
 * - The final balance equals the backend's `outstanding` figure
 */
export function buildHouseholdLedger(
  assessments: HouseholdAssessment[],
): LedgerEntry[] {
  const rows: Array<Omit<LedgerEntry, 'balance'>> = []

  for (const assessment of assessments) {
    if (UNBILLED_STATUSES.has(assessment.status)) continue

    rows.push({
      id: `assessment:${assessment.id}`,
      date: assessment.dueDate,
      type: 'assessment',
      description: assessment.title,
      number: assessment.assessmentNumber,
      status: assessment.status,
      method: null,
      referenceNumber: null,
      debit: Number(assessment.amount),
      credit: 0,
    })

    for (const payment of assessment.payments ?? []) {
      rows.push({
        id: `payment:${payment.id}`,
        date: payment.paymentDate,
        type: 'payment',
        description: `Payment — ${assessment.title}`,
        number: payment.paymentNumber,
        status: payment.status,
        method: payment.method ?? null,
        referenceNumber: payment.referenceNumber ?? null,
        debit: 0,
        credit: payment.status === VERIFIED ? Number(payment.amount) : 0,
      })
    }
  }

  rows.sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime()
    if (dateDiff !== 0) return dateDiff
    // Assessments (bills) before payments on the same day
    if (a.type !== b.type) return a.type === 'assessment' ? -1 : 1
    return a.id.localeCompare(b.id)
  })

  let balance = 0
  const entries: LedgerEntry[] = rows.map((row) => {
    balance += row.debit - row.credit
    return { ...row, balance }
  })

  return entries
}

/** RFC-4180-style CSV escaping */
export function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function ledgerToCsv(entries: LedgerEntry[]): string {
  const header = [
    'Date',
    'Description',
    'Number',
    'Status',
    'Reference',
    'Debit',
    'Credit',
    'Balance',
  ]
  const body = entries.map((entry) =>
    [
      entry.date,
      entry.description,
      entry.number,
      entry.status,
      entry.referenceNumber ?? '',
      entry.type === 'assessment' ? entry.debit.toFixed(2) : '',
      entry.type === 'payment' ? entry.credit.toFixed(2) : '',
      entry.balance.toFixed(2),
    ]
      .map(csvEscape)
      .join(','),
  )
  return [header.map(csvEscape).join(','), ...body].join('\n')
}

export function downloadLedgerCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ledgerFilename(unitLabel: string): string {
  const slug =
    unitLabel
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'household'
  return `household-ledger-${slug}.csv`
}

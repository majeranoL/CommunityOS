import { describe, expect, it } from 'vitest'
import { buildDuesRows, duesToCsv } from '@/features/households/lib/dues'
import type { HouseholdAssessment } from '@/features/households/types/household'

function assessment(
  id: string,
  overrides: Partial<HouseholdAssessment> = {},
): HouseholdAssessment {
  return {
    id,
    assessmentNumber: `A-${id}`,
    title: 'Monthly dues',
    period: '2026-01',
    amount: 1000,
    paidAmount: 0,
    dueDate: '2026-01-05T00:00:00.000Z',
    status: 'ISSUED',
    payments: [],
    ...overrides,
  }
}

describe('buildDuesRows', () => {
  it('emits one consolidated row per billed assessment', () => {
    const rows = buildDuesRows([
      assessment('a1', { amount: 1000, paidAmount: 400 }),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      billed: 1000,
      paid: 400,
      balance: 600,
    })
  })

  it('does not emit separate payment rows for a paid bill', () => {
    const rows = buildDuesRows([
      assessment('a1', {
        amount: 1000,
        paidAmount: 1000,
        payments: [
          {
            id: 'p1',
            paymentNumber: 'P-1',
            amount: 1000,
            paymentDate: '2026-01-10T00:00:00.000Z',
            method: 'GCASH',
            referenceNumber: 'REF-1',
            status: 'VERIFIED',
          },
        ],
      }),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].balance).toBe(0)
  })

  it('uses the discounted amount as the billed figure', () => {
    const rows = buildDuesRows([
      assessment('discounted', { amount: 1000, discountAmount: 125 }),
    ])
    expect(rows[0].billed).toBe(875)
  })

  it('clamps the balance to zero when paid exceeds billed', () => {
    const rows = buildDuesRows([
      assessment('overpaid', { amount: 500, paidAmount: 700 }),
    ])
    expect(rows[0].balance).toBe(0)
  })

  it('excludes DRAFT and CANCELLED assessments', () => {
    const rows = buildDuesRows([
      assessment('draft', { status: 'DRAFT' }),
      assessment('cancelled', { status: 'CANCELLED' }),
      assessment('issued'),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0].assessmentNumber).toBe('A-issued')
  })

  it('sorts rows by due date then assessment number', () => {
    const rows = buildDuesRows([
      assessment('later', { dueDate: '2026-02-05T00:00:00.000Z' }),
      assessment('earlier', { dueDate: '2026-01-05T00:00:00.000Z' }),
    ])

    expect(rows.map((row) => row.assessmentNumber)).toEqual([
      'A-earlier',
      'A-later',
    ])
  })
})

describe('duesToCsv', () => {
  it('emits a header row followed by one row per dues line', () => {
    const csv = duesToCsv(buildDuesRows([assessment('a1')]))

    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('1000.00')
    expect(lines[1]).toContain('A-a1')
  })
})
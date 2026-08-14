import { describe, expect, it } from 'vitest'
import {
  buildHouseholdLedger,
  csvEscape,
  ledgerToCsv,
} from '@/features/households/lib/ledger'
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

describe('buildHouseholdLedger', () => {
  it('turns an assessment into a debit row', () => {
    const entries = buildHouseholdLedger([assessment('a1')])

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      type: 'assessment',
      debit: 1000,
      credit: 0,
      balance: 1000,
    })
  })

  it('applies confirmed payments as credits and runs a balance', () => {
    const entries = buildHouseholdLedger([
      assessment('a1', {
        amount: 1000,
        payments: [
          {
            id: 'p1',
            paymentNumber: 'P-1',
            amount: 400,
            paymentDate: '2026-01-10T00:00:00.000Z',
            method: 'GCASH',
            referenceNumber: 'REF-1',
            status: 'VERIFIED',
          },
        ],
      }),
    ])

    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ type: 'assessment', balance: 1000 })
    expect(entries[1]).toMatchObject({
      type: 'payment',
      credit: 400,
      balance: 600,
      referenceNumber: 'REF-1',
    })
  })

  it('lists pending payments as informational rows that do not change the balance', () => {
    const entries = buildHouseholdLedger([
      assessment('a1', {
        amount: 1000,
        payments: [
          {
            id: 'p1',
            paymentNumber: 'P-1',
            amount: 1000,
            paymentDate: '2026-01-10T00:00:00.000Z',
            method: 'CASH',
            referenceNumber: null,
            status: 'PENDING_VERIFICATION',
          },
        ],
      }),
    ])

    expect(entries).toHaveLength(2)
    expect(entries[1]).toMatchObject({ type: 'payment', credit: 0 })
    expect(entries[1].balance).toBe(1000)
  })

  it('excludes DRAFT and CANCELLED assessments', () => {
    const entries = buildHouseholdLedger([
      assessment('draft', { status: 'DRAFT' }),
      assessment('cancelled', { status: 'CANCELLED' }),
      assessment('issued'),
    ])

    expect(entries).toHaveLength(1)
    expect(entries[0].number).toBe('A-issued')
  })

  it('ends with a balance equal to the outstanding amount', () => {
    const entries = buildHouseholdLedger([
      assessment('a1', {
        amount: 2000,
        payments: [
          {
            id: 'p1',
            paymentNumber: 'P-1',
            amount: 700,
            paymentDate: '2026-01-10T00:00:00.000Z',
            method: 'BANK_TRANSFER',
            referenceNumber: null,
            status: 'VERIFIED',
          },
        ],
      }),
      assessment('a2', { amount: 500, dueDate: '2026-02-05T00:00:00.000Z' }),
    ])

    const finalBalance = entries[entries.length - 1].balance
    expect(finalBalance).toBe(1800)
  })

  it('sorts chronologically with assessments before payments on the same day', () => {
    const entries = buildHouseholdLedger([
      assessment('a1', {
        dueDate: '2026-02-05T00:00:00.000Z',
        payments: [
          {
            id: 'p1',
            paymentNumber: 'P-1',
            amount: 500,
            paymentDate: '2026-02-05T08:00:00.000Z',
            method: 'CASH',
            referenceNumber: null,
            status: 'VERIFIED',
          },
        ],
      }),
      assessment('a2', { dueDate: '2026-01-05T00:00:00.000Z' }),
    ])

    expect(entries.map((entry) => entry.id)).toEqual([
      'assessment:a2',
      'assessment:a1',
      'payment:p1',
    ])
  })
})

describe('csvEscape', () => {
  it('passes through plain values', () => {
    expect(csvEscape('hello')).toBe('hello')
    expect(csvEscape(42)).toBe('42')
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })

  it('quotes values containing commas, quotes, or newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape('line\nbreak')).toBe('"line\nbreak"')
  })
})

describe('ledgerToCsv', () => {
  it('emits a header row followed by one row per entry', () => {
    const csv = ledgerToCsv(buildHouseholdLedger([assessment('a1')]))

    const lines = csv.split('\n')
    expect(lines[0]).toBe(
      'Date,Description,Number,Status,Reference,Debit,Credit,Balance',
    )
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('1000.00')
    expect(lines[1]).toContain('A-a1')
  })

  it('includes the payment reference in its row', () => {
    const csv = ledgerToCsv(
      buildHouseholdLedger([
        assessment('a1', {
          payments: [
            {
              id: 'p1',
              paymentNumber: 'P-1',
              amount: 400,
              paymentDate: '2026-01-10T00:00:00.000Z',
              method: 'GCASH',
              referenceNumber: 'REF,1',
              status: 'VERIFIED',
            },
          ],
        }),
      ]),
    )

    expect(csv).toContain('"REF,1"')
  })
})

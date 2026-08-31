import { AssessmentStatus } from '@prisma/client';

import {
  buildDuesTracker,
  DuesTrackerAssessmentInput,
  DuesTrackerHouseholdInput,
} from './dues-tracker';

const households: DuesTrackerHouseholdInput[] = [
  { id: 'h1', block: '1', lot: 'A', unit: null },
  { id: 'h2', block: '1', lot: 'B', unit: null },
  { id: 'h3', block: '2', lot: 'A', unit: null },
];

function assessment(
  overrides: Partial<DuesTrackerAssessmentInput> & { householdId: string },
): DuesTrackerAssessmentInput {
  return {
    id: `ass-${overrides.householdId}-${overrides.period ?? 'p'}`,
    amount: 1000,
    paidAmount: 0,
    status: AssessmentStatus.ISSUED,
    period: '2026-01',
    dueDate: new Date('2026-01-15T00:00:00.000Z'),
    ...overrides,
  };
}

describe('buildDuesTracker', () => {
  const now = new Date('2026-03-15T00:00:00.000Z');

  it('builds one row per household with an empty grid', () => {
    const result = buildDuesTracker(households, [], now);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toMatchObject({
      householdId: 'h1',
      unitLabel: 'Blk 1 \u00b7 Lot A',
      monthsPaid: 0,
      monthsBehind: 0,
      outstanding: 0,
      standing: 'GOOD',
      periods: {},
    });
    expect(result.periods).toEqual([]);
    expect(result.summaries).toEqual({});
  });

  it('counts a fully paid period towards monthsPaid', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
          paidAmount: 1000,
          status: AssessmentStatus.PAID,
        }),
      ],
      now,
    );

    expect(result.rows[0].monthsPaid).toBe(1);
    expect(result.rows[1].monthsPaid).toBe(0);
    expect(result.rows[0].periods['2026-01']).toEqual({
      assessmentId: 'ass-h1-2026-01',
      status: AssessmentStatus.PAID,
    });
  });

  it('does not count partial or overdue months towards monthsPaid', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
          paidAmount: 400,
          status: AssessmentStatus.PARTIALLY_PAID,
        }),
        assessment({
          householdId: 'h1',
          period: '2026-02',
          status: AssessmentStatus.OVERDUE,
        }),
      ],
      now,
    );

    expect(result.rows[0].monthsPaid).toBe(0);
  });

  it('counts distinct months behind', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
          dueDate: new Date('2026-01-15T00:00:00.000Z'),
        }),
        assessment({
          householdId: 'h1',
          period: '2026-02',
          dueDate: new Date('2026-02-15T00:00:00.000Z'),
        }),
      ],
      now,
    );

    expect(result.rows[0].monthsBehind).toBe(2);
    expect(result.rows[0].standing).toBe('GOOD');
  });

  it('flags a household BAD when 4+ distinct months behind', () => {
    const result = buildDuesTracker(
      households,
      [9, 10, 11, 12].map((month) => {
        const padded = String(month).padStart(2, '0');
        return assessment({
          householdId: 'h1',
          period: `2025-${padded}`,
          dueDate: new Date(`2025-${padded}-15T00:00:00.000Z`),
        });
      }),
      now,
    );

    expect(result.rows[0].monthsBehind).toBe(4);
    expect(result.rows[0].standing).toBe('BAD');
  });

  it('leaves a NONE cell when a household has no assessment for a period', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
        }),
      ],
      now,
    );

    expect(result.rows[1].periods).toEqual({});
    expect(result.periods).toEqual(['2026-01']);
  });

  it('excludes CANCELLED assessments from outstanding and summaries', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
          status: AssessmentStatus.CANCELLED,
        }),
      ],
      now,
    );

    expect(result.rows[0].periods['2026-01'].status).toBe(
      AssessmentStatus.CANCELLED,
    );
    expect(result.rows[0].outstanding).toBe(0);
    expect(result.rows[0].monthsPaid).toBe(0);
    expect(result.summaries['2026-01'].householdCount).toBe(0);
    expect(result.summaries['2026-01'].paidCount).toBe(0);
  });

  it('excludes DRAFT assessments from outstanding and summaries', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
          status: AssessmentStatus.DRAFT,
        }),
      ],
      now,
    );

    expect(result.rows[0].periods['2026-01'].status).toBe(
      AssessmentStatus.DRAFT,
    );
    expect(result.rows[0].outstanding).toBe(0);
    expect(result.summaries['2026-01'].householdCount).toBe(0);
  });

  it('computes partial outstanding and per-period summaries', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({
          householdId: 'h1',
          period: '2026-01',
          paidAmount: 1000,
          status: AssessmentStatus.PAID,
        }),
        assessment({
          householdId: 'h2',
          period: '2026-01',
          paidAmount: 400,
          status: AssessmentStatus.PARTIALLY_PAID,
        }),
        assessment({
          householdId: 'h3',
          period: '2026-01',
        }),
      ],
      now,
    );

    const summary = result.summaries['2026-01'];

    expect(result.rows[0].outstanding).toBe(0);
    expect(result.rows[1].outstanding).toBe(600);
    expect(result.rows[2].outstanding).toBe(1000);

    expect(summary).toMatchObject({
      period: '2026-01',
      billed: 3000,
      collected: 1400,
      paidCount: 1,
      householdCount: 3,
    });
    expect(summary.collectionRate).toBeCloseTo(1 / 3);
    expect(summary.collectedRate).toBeCloseTo(1400 / 3000);
  });

  it('returns periods sorted newest first', () => {
    const result = buildDuesTracker(
      households,
      [
        assessment({ householdId: 'h1', period: '2026-01' }),
        assessment({ householdId: 'h1', period: '2026-02' }),
        assessment({ householdId: 'h1', period: '2025-12' }),
      ],
      now,
    );

    expect(result.periods).toEqual(['2026-02', '2026-01', '2025-12']);
  });

  it('respects a custom delinquency threshold (default 3)', () => {
    const overdue = [
      assessment({
        householdId: 'h1',
        period: '2026-01',
        dueDate: new Date('2026-01-15T00:00:00.000Z'),
      }),
      assessment({
        householdId: 'h1',
        period: '2026-02',
        dueDate: new Date('2026-02-15T00:00:00.000Z'),
      }),
      assessment({
        householdId: 'h1',
        period: '2026-03',
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ];

    expect(buildDuesTracker(households, overdue, now, 2).rows[0].standing).toBe(
      'BAD',
    );

    expect(buildDuesTracker(households, overdue, now, 4).rows[0].standing).toBe(
      'GOOD',
    );

    expect(buildDuesTracker(households, overdue, now).rows[0].standing).toBe(
      'BAD',
    );
  });
});

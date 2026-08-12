import { AssessmentStatus } from '@prisma/client';

import {
  summarizeFinance,
  type HouseholdFinanceSummary,
} from './households.service';

const GOOD = 'GOOD';
const BAD = 'BAD';

function assessment(
  householdId: string,
  amount: number,
  dueDate: Date,
  status: AssessmentStatus,
) {
  return { householdId, amount, dueDate, status };
}

describe('summarizeFinance', () => {
  const now = new Date('2026-07-15T00:00:00.000Z');

  it('sums billed amounts and outstanding after confirmed payments', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment('h1', 1000, new Date('2026-01-05'), AssessmentStatus.PAID),
        assessment('h1', 500, new Date('2026-02-05'), AssessmentStatus.ISSUED),
      ],
      new Map([['h1', 1000]]),
      now,
    );

    expect(summary.get('h1')).toMatchObject<Partial<HouseholdFinanceSummary>>({
      totalBilled: 1500,
      totalPaid: 1000,
      outstanding: 500,
    });
  });

  it('marks GOOD standing with fewer than 3 overdue months', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment(
          'h1',
          1000,
          new Date('2026-06-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-05-05'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({
      monthsBehind: 2,
      standing: GOOD,
    });
  });

  it('marks BAD standing with unpaid assessments across 3 distinct months', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment(
          'h1',
          1000,
          new Date('2026-04-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-05-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-06-05'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({ monthsBehind: 3, standing: BAD });
  });

  it('does not count assessments that are not yet due', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment('h1', 1000, new Date('2026-09-05'), AssessmentStatus.ISSUED),
        assessment(
          'h1',
          1000,
          new Date('2026-01-05'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-02-05'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({
      monthsBehind: 2,
      standing: GOOD,
    });
  });

  it('counts overdue months only once per calendar month', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment(
          'h1',
          1000,
          new Date('2026-06-01'),
          AssessmentStatus.OVERDUE,
        ),
        assessment(
          'h1',
          1000,
          new Date('2026-06-30'),
          AssessmentStatus.OVERDUE,
        ),
      ],
      new Map(),
      now,
    );

    expect(summary.get('h1')).toMatchObject({ monthsBehind: 1 });
  });

  it('does not count fully paid assessments but counts unpaid partials', () => {
    const summary = summarizeFinance(
      ['h1'],
      [
        assessment('h1', 1000, new Date('2026-06-05'), AssessmentStatus.PAID),
        assessment(
          'h1',
          1000,
          new Date('2026-07-05'),
          AssessmentStatus.PARTIALLY_PAID,
        ),
      ],
      new Map([['h1', 1400]]),
      now,
    );

    expect(summary.get('h1')).toMatchObject({
      monthsBehind: 1,
      standing: GOOD,
    });
  });

  it('returns an entry for every requested household id', () => {
    const summary = summarizeFinance(['h1', 'h2'], [], new Map(), now);

    expect(summary.get('h1')).toBeDefined();
    expect(summary.get('h2')).toBeDefined();
    expect(summary.get('h1')).toMatchObject({
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
      monthsBehind: 0,
      standing: GOOD,
    });
  });
});

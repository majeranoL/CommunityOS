import { AssessmentStatus } from '@prisma/client';

import {
  buildDuesMonthSummaries,
  isValidPeriodKey,
  summarizeMonthRows,
  type DuesMonthRow,
} from './dues-months-tracker';

function row(overrides: Partial<DuesMonthRow> = {}): DuesMonthRow {
  return {
    period: '2026-08',
    billingPeriodKey: null,
    amount: 250,
    paidAmount: 0,
    status: AssessmentStatus.ISSUED,
    dueDate: new Date('2026-08-05T00:00:00Z'),
    ...overrides,
  };
}

describe('dues-months-tracker', () => {
  describe('isValidPeriodKey', () => {
    it('accepts YYYY-MM and rejects other formats', () => {
      expect(isValidPeriodKey('2026-08')).toBe(true);
      expect(isValidPeriodKey('2026-13')).toBe(false);
      expect(isValidPeriodKey('August')).toBe(false);
      expect(isValidPeriodKey('')).toBe(false);
    });
  });

  describe('buildDuesMonthSummaries', () => {
    it('groups rows by period and sorts newest first with friendly labels', () => {
      const summaries = buildDuesMonthSummaries([
        row({ period: '2026-07' }),
        row({ period: '2026-08' }),
        row({ period: '2026-08' }),
      ]);

      expect(summaries.map((summary) => summary.periodKey)).toEqual([
        '2026-08',
        '2026-07',
      ]);
      expect(summaries[0].label).toBe('August 2026');
      expect(summaries[1].label).toBe('July 2026');
    });

    it('falls back to billing period key then due date month', () => {
      const summaries = buildDuesMonthSummaries([
        row({ period: null, billingPeriodKey: null }),
        row({ period: null, billingPeriodKey: '2026-09' }),
      ]);

      // first row derives from its due date (August), second from the
      // billing period key (September)
      expect(summaries.map((item) => item.periodKey).sort()).toEqual(
        ['2026-08', '2026-09'].sort(),
      );
    });
  });

  describe('summarizeMonthRows', () => {
    it('counts paid / partial / unpaid and totals collected vs expected', () => {
      const summary = summarizeMonthRows('2026-08', [
        row({ status: AssessmentStatus.PAID, paidAmount: 250 }),
        row({ status: AssessmentStatus.PAID, paidAmount: 250 }),
        row({ status: AssessmentStatus.PARTIALLY_PAID, paidAmount: 100 }),
        row({ status: AssessmentStatus.ISSUED }),
        row({ status: AssessmentStatus.OVERDUE }),
      ]);

      expect(summary.householdCount).toBe(5);
      expect(summary.paidCount).toBe(2);
      expect(summary.partialCount).toBe(1);
      expect(summary.unpaidCount).toBe(2);
      expect(summary.overdueCount).toBe(1);
      expect(summary.perHousehold).toBe(250);
      expect(summary.totalExpected).toBe(1250);
      expect(summary.totalCollected).toBe(600);
    });

    it('excludes waived rows from totals but reports them separately', () => {
      const summary = summarizeMonthRows('2026-08', [
        row({ status: AssessmentStatus.PAID, paidAmount: 250 }),
        row({ status: AssessmentStatus.WAIVED }),
      ]);

      expect(summary.waivedCount).toBe(1);
      expect(summary.householdCount).toBe(2);
      expect(summary.totalExpected).toBe(250);
      expect(summary.totalCollected).toBe(250);
      expect(summary.unpaidCount).toBe(0);
    });

    it('ignores cancelled rows entirely', () => {
      const summary = summarizeMonthRows('2026-08', [
        row({ status: AssessmentStatus.CANCELLED, amount: 999 }),
      ]);

      expect(summary.householdCount).toBe(0);
      expect(summary.totalExpected).toBe(0);
      expect(summary.dueDate).toBeNull();
    });

    it('picks the most common amount as per-household', () => {
      const summary = summarizeMonthRows('2026-08', [
        row({ amount: 250 }),
        row({ amount: 300 }),
        row({ amount: 300 }),
      ]);

      expect(summary.perHousehold).toBe(300);
    });
  });
});

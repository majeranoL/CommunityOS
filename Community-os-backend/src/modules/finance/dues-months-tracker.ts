import { AssessmentStatus } from '@prisma/client';

export interface DuesMonthRow {
  period: string | null;
  billingPeriodKey: string | null;
  amount: number;
  paidAmount: number;
  status: AssessmentStatus;
  dueDate: Date;
}

export interface DuesMonthSummary {
  periodKey: string;
  label: string;
  perHousehold: number;
  householdCount: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  overdueCount: number;
  waivedCount: number;
  totalExpected: number;
  totalCollected: number;
  dueDate: string | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function isValidPeriodKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function resolvePeriodKey(row: DuesMonthRow): string {
  if (row.period && isValidPeriodKey(row.period)) return row.period;
  if (row.billingPeriodKey && isValidPeriodKey(row.billingPeriodKey)) {
    return row.billingPeriodKey;
  }
  const date = new Date(row.dueDate);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthLabel(periodKey: string): string {
  const [year, month] = periodKey.split('-').map((part) => parseInt(part, 10));
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Groups assessment rows into one summary per dues month.
 * WAIVED rows are counted separately and excluded from totals.
 */
export function buildDuesMonthSummaries(
  rows: DuesMonthRow[],
): DuesMonthSummary[] {
  const groups = new Map<string, DuesMonthRow[]>();

  for (const row of rows) {
    const periodKey = resolvePeriodKey(row);
    const bucket = groups.get(periodKey);
    if (bucket) {
      bucket.push(row);
    } else {
      groups.set(periodKey, [row]);
    }
  }

  const summaries: DuesMonthSummary[] = [];

  for (const [periodKey, group] of groups) {
    summaries.push(summarizeMonthRows(periodKey, group));
  }

  return summaries.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

/** Aggregates a single month's rows. CANCELLED rows are ignored entirely. */
export function summarizeMonthRows(
  periodKey: string,
  rows: DuesMonthRow[],
): DuesMonthSummary {
  const counted = rows.filter(
    (row) =>
      row.status !== AssessmentStatus.CANCELLED &&
      row.status !== AssessmentStatus.WAIVED,
  );
  const waivedCount = rows.filter(
    (row) => row.status === AssessmentStatus.WAIVED,
  ).length;

  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let overdueCount = 0;
  let totalExpected = 0;
  let totalCollected = 0;

  for (const row of counted) {
    totalExpected += row.amount;
    totalCollected += row.paidAmount;

    switch (row.status) {
      case AssessmentStatus.PAID:
        paidCount += 1;
        break;
      case AssessmentStatus.PARTIALLY_PAID:
        partialCount += 1;
        break;
      case AssessmentStatus.OVERDUE:
        unpaidCount += 1;
        overdueCount += 1;
        break;
      default:
        unpaidCount += 1;
        break;
    }
  }

  let earliestDue: Date | null = null;
  for (const row of counted) {
    if (!earliestDue || row.dueDate < earliestDue) earliestDue = row.dueDate;
  }

  return {
    periodKey,
    label: monthLabel(periodKey),
    perHousehold: modeAmount(counted),
    householdCount: counted.length + waivedCount,
    paidCount,
    partialCount,
    unpaidCount,
    overdueCount,
    waivedCount,
    totalExpected: round2(totalExpected),
    totalCollected: round2(totalCollected),
    dueDate: earliestDue ? earliestDue.toISOString() : null,
  };
}

function modeAmount(rows: DuesMonthRow[]): number {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const amount = round2(row.amount);
    counts.set(amount, (counts.get(amount) ?? 0) + 1);
  }

  let best = 0;
  let bestCount = -1;
  for (const [amount, count] of counts) {
    if (count > bestCount || (count === bestCount && amount > best)) {
      best = amount;
      bestCount = count;
    }
  }

  return best;
}

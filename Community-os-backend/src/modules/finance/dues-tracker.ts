import { AssessmentStatus } from '@prisma/client';

export type DuesCellStatus = AssessmentStatus | 'NONE';

export type DuesStanding = 'GOOD' | 'BAD';

export interface DuesTrackerHouseholdInput {
  id: string;
  block: string | null;
  lot: string | null;
  unit: string | null;
}

export interface DuesTrackerAssessmentInput {
  id: string;
  householdId: string;
  amount: number;
  paidAmount: number;
  status: AssessmentStatus;
  period: string | null;
  dueDate: Date;
}

export interface DuesTrackerCell {
  assessmentId: string;
  status: DuesCellStatus;
}

export interface DuesTrackerRow {
  householdId: string;
  unitLabel: string;
  monthsPaid: number;
  monthsBehind: number;
  outstanding: number;
  standing: DuesStanding;
  periods: Record<string, DuesTrackerCell>;
}

export interface DuesPeriodSummary {
  period: string;
  billed: number;
  collected: number;
  paidCount: number;
  householdCount: number;
  collectionRate: number;
  collectedRate: number;
}

export interface DuesTrackerResult {
  periods: string[];
  rows: DuesTrackerRow[];
  summaries: Record<string, DuesPeriodSummary>;
}

function unitLabel(household: DuesTrackerHouseholdInput) {
  const parts = [
    household.block ? `Blk ${household.block}` : null,
    household.lot ? `Lot ${household.lot}` : null,
    household.unit ? `Unit ${household.unit}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' \u00b7 ') : 'Unnamed unit';
}

function isBilled(status: AssessmentStatus) {
  return (
    status !== AssessmentStatus.DRAFT && status !== AssessmentStatus.CANCELLED
  );
}

/**
 * Pure computation for the dues tracker matrix. Given the ACTIVE households
 * and their assessments (fetched by the caller), derives a household x period
 * grid, per-household months-paid / months-behind / outstanding / standing,
 * and a per-period collection summary.
 *
 * - monthsPaid counts distinct periods where the assessment is fully PAID.
 * - monthsBehind counts distinct past-due calendar months with unpaid dues
 *   (same rule as summarizeFinance).
 * - standing is BAD once a household is 3+ distinct months behind, or once it
 *   reaches the configured delinquency threshold.
 */
export function buildDuesTracker(
  households: DuesTrackerHouseholdInput[],
  assessments: DuesTrackerAssessmentInput[],
  now: Date = new Date(),
  delinquencyThresholdMonths: number = 3,
): DuesTrackerResult {
  const rows: DuesTrackerRow[] = households.map((household) => ({
    householdId: household.id,
    unitLabel: unitLabel(household),
    monthsPaid: 0,
    monthsBehind: 0,
    outstanding: 0,
    standing: 'GOOD',
    periods: {},
  }));

  const rowByHousehold = new Map(rows.map((row) => [row.householdId, row]));
  const paidPeriods = new Map<string, Set<string>>();
  const overdueMonths = new Map<string, Set<string>>();
  const periods = new Set<string>();

  for (const assessment of assessments) {
    if (!assessment.period) continue;

    const row = rowByHousehold.get(assessment.householdId);
    if (!row) continue;

    periods.add(assessment.period);

    row.periods[assessment.period] = {
      assessmentId: assessment.id,
      status: assessment.status,
    };

    if (isBilled(assessment.status)) {
      row.outstanding += Math.max(
        0,
        Number(assessment.amount) - Number(assessment.paidAmount),
      );
    }

    if (assessment.status === AssessmentStatus.PAID) {
      if (!paidPeriods.has(row.householdId)) {
        paidPeriods.set(row.householdId, new Set());
      }
      paidPeriods.get(row.householdId)!.add(assessment.period);
    }

    const isUnpaid =
      assessment.status === AssessmentStatus.ISSUED ||
      assessment.status === AssessmentStatus.PARTIALLY_PAID ||
      assessment.status === AssessmentStatus.OVERDUE;

    if (isUnpaid && assessment.dueDate < now) {
      const key = `${assessment.dueDate.getFullYear()}-${assessment.dueDate.getMonth()}`;

      if (!overdueMonths.has(row.householdId)) {
        overdueMonths.set(row.householdId, new Set());
      }
      overdueMonths.get(row.householdId)!.add(key);
    }
  }

  for (const row of rows) {
    row.monthsPaid = paidPeriods.get(row.householdId)?.size ?? 0;
    row.monthsBehind = overdueMonths.get(row.householdId)?.size ?? 0;
    row.standing =
      row.monthsBehind >= delinquencyThresholdMonths ? 'BAD' : 'GOOD';
  }

  const sortedPeriods = [...periods].sort((a, b) => b.localeCompare(a));

  const summaries: Record<string, DuesPeriodSummary> = {};

  for (const period of sortedPeriods) {
    const billedAssessments = assessments.filter(
      (assessment) =>
        assessment.period === period && isBilled(assessment.status),
    );

    const billed = billedAssessments.reduce(
      (sum, assessment) => sum + Number(assessment.amount),
      0,
    );

    const collected = billedAssessments.reduce(
      (sum, assessment) =>
        sum +
        Math.min(Number(assessment.paidAmount), Number(assessment.amount)),
      0,
    );

    const paidCount = billedAssessments.filter(
      (assessment) => assessment.status === AssessmentStatus.PAID,
    ).length;

    const householdCount = billedAssessments.length;

    summaries[period] = {
      period,
      billed,
      collected,
      paidCount,
      householdCount,
      collectionRate: householdCount > 0 ? paidCount / householdCount : 0,
      collectedRate: billed > 0 ? collected / billed : 0,
    };
  }

  return { periods: sortedPeriods, rows, summaries };
}

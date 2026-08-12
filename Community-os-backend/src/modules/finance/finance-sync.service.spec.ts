import { AssessmentStatus } from '@prisma/client';

import {
  determineAssessmentStatus,
  FinanceSyncService,
} from './finance-sync.service';

describe('determineAssessmentStatus', () => {
  const dueDate = new Date('2026-01-31T00:00:00.000Z');
  const now = new Date('2026-02-15T00:00:00.000Z');

  it('keeps a CANCELLED assessment cancelled regardless of payments', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.CANCELLED,
        amount: 1000,
        paidAmount: 1000,
        dueDate,
        now,
      }),
    ).toBe(AssessmentStatus.CANCELLED);
  });

  it('marks a fully paid assessment as PAID', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.PARTIALLY_PAID,
        amount: 1000,
        paidAmount: 1000,
        dueDate,
        now,
      }),
    ).toBe(AssessmentStatus.PAID);
  });

  it('marks an overpaid assessment as PAID', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.ISSUED,
        amount: 1000,
        paidAmount: 1250,
        dueDate,
        now,
      }),
    ).toBe(AssessmentStatus.PAID);
  });

  it('marks a partially paid assessment as PARTIALLY_PAID', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.ISSUED,
        amount: 1000,
        paidAmount: 400,
        dueDate,
        now,
      }),
    ).toBe(AssessmentStatus.PARTIALLY_PAID);
  });

  it('marks an unpaid assessment past its due date as OVERDUE', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.ISSUED,
        amount: 1000,
        paidAmount: 0,
        dueDate,
        now,
      }),
    ).toBe(AssessmentStatus.OVERDUE);
  });

  it('keeps an unpaid assessment before its due date as ISSUED', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.ISSUED,
        amount: 1000,
        paidAmount: 0,
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
        now,
      }),
    ).toBe(AssessmentStatus.ISSUED);
  });

  it('defaults now to the current time when omitted', () => {
    expect(
      determineAssessmentStatus({
        status: AssessmentStatus.ISSUED,
        amount: 1000,
        paidAmount: 0,
        dueDate: new Date('2000-01-01T00:00:00.000Z'),
      }),
    ).toBe(AssessmentStatus.OVERDUE);
  });

  it('returns the singleton service provider', () => {
    const service = new FinanceSyncService({} as never);
    expect(service).toBeInstanceOf(FinanceSyncService);
  });
});

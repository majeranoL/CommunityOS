import { Injectable } from '@nestjs/common';

import {
  AssessmentStatus,
  BillingPeriodStatus,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface AssessmentStatusInput {
  status: AssessmentStatus;
  amount: number;
  paidAmount: number;
  dueDate: Date;
  now?: Date;
}

export function determineAssessmentStatus(
  input: AssessmentStatusInput,
): AssessmentStatus {
  const { status, amount, paidAmount, dueDate } = input;
  const now = input.now ?? new Date();

  if (
    status === AssessmentStatus.CANCELLED ||
    status === AssessmentStatus.WAIVED
  ) {
    return status;
  }

  if (paidAmount >= amount) {
    return AssessmentStatus.PAID;
  }

  if (paidAmount > 0) {
    return AssessmentStatus.PARTIALLY_PAID;
  }

  return dueDate < now ? AssessmentStatus.OVERDUE : AssessmentStatus.ISSUED;
}

@Injectable()
export class FinanceSyncService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Recompute an assessment's paidAmount + status
  // from its VERIFIED payment allocations.
  // PENDING_VERIFICATION / REJECTED / REFUNDED /
  // CANCELLED payments are excluded, and reversed
  // allocations are ignored.
  // ==========================================

  async syncAssessment(communityId: string, assessmentId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: assessmentId,
      },
    });

    if (!assessment || assessment.communityId !== communityId) {
      return;
    }

    const allocated = await this.prisma.paymentAllocation.aggregate({
      where: {
        communityId,
        assessmentId,
        reversedAt: null,
        payment: {
          deletedAt: null,
          status: PaymentStatus.VERIFIED,
        },
      },
      _sum: {
        allocatedAmount: true,
      },
    });

    const paidAmount = allocated._sum.allocatedAmount
      ? allocated._sum.allocatedAmount.toNumber()
      : 0;

    const assessmentAmount = assessment.amount.toNumber();

    const status = determineAssessmentStatus({
      status: assessment.status,
      amount: assessmentAmount,
      paidAmount,
      dueDate: assessment.dueDate,
    });

    if (
      status === assessment.status &&
      paidAmount === assessment.paidAmount.toNumber()
    ) {
      return;
    }

    await this.prisma.assessment.update({
      where: {
        id: assessmentId,
      },
      data: {
        paidAmount,
        status,
      },
    });
  }

  // ==========================================
  // Recompute a billing period's status from its
  // assessments. WAIVED periods stay waived; a
  // period is PAID once every assessment is PAID
  // or WAIVED; OVERDUE once any assessment is
  // OVERDUE and the period due date has passed.
  // ==========================================

  async syncPeriod(communityId: string, periodId: string) {
    const period = await this.prisma.billingPeriod.findUnique({
      where: {
        id: periodId,
      },
      include: {
        assessments: {
          where: { deletedAt: null },
          select: { status: true },
        },
      },
    });

    if (!period || period.communityId !== communityId) {
      return;
    }

    const active = period.assessments.filter(
      (assessment) => assessment.status !== AssessmentStatus.CANCELLED,
    );

    let status: BillingPeriodStatus = BillingPeriodStatus.OPEN;

    if (period.status === BillingPeriodStatus.WAIVED) {
      status = BillingPeriodStatus.WAIVED;
    } else if (period.status === BillingPeriodStatus.CANCELLED) {
      status = BillingPeriodStatus.CANCELLED;
    } else if (
      active.length > 0 &&
      active.every((a) => a.status === AssessmentStatus.PAID)
    ) {
      status = BillingPeriodStatus.PAID;
    } else if (
      active.length > 0 &&
      active.some((a) => a.status === AssessmentStatus.OVERDUE) &&
      period.dueDate < new Date()
    ) {
      status = BillingPeriodStatus.OVERDUE;
    }

    if (status !== period.status) {
      await this.prisma.billingPeriod.update({
        where: { id: periodId },
        data: { status },
      });
    }

    // Reflect the period's status on its open assessments
    if (status === BillingPeriodStatus.WAIVED) {
      await this.prisma.assessment.updateMany({
        where: {
          communityId,
          billingPeriodId: periodId,
          deletedAt: null,
          status: {
            in: [AssessmentStatus.ISSUED, AssessmentStatus.PARTIALLY_PAID],
          },
        },
        data: { status: AssessmentStatus.WAIVED },
      });
    } else if (
      status === BillingPeriodStatus.PAID ||
      status === BillingPeriodStatus.CANCELLED
    ) {
      await this.prisma.assessment.updateMany({
        where: {
          communityId,
          billingPeriodId: periodId,
          deletedAt: null,
          status: AssessmentStatus.WAIVED,
        },
        data: { status: AssessmentStatus.ISSUED },
      });
    }
  }

  // ==========================================
  // Lazy OVERDUE sweep: flip issued / partially
  // paid assessments past their due date to
  // OVERDUE, then re-derive period statuses.
  // ==========================================

  async sweepOverdue(communityId: string) {
    await this.prisma.assessment.updateMany({
      where: {
        communityId,
        deletedAt: null,
        dueDate: {
          lt: new Date(),
        },
        status: {
          in: [AssessmentStatus.ISSUED, AssessmentStatus.PARTIALLY_PAID],
        },
      },
      data: {
        status: AssessmentStatus.OVERDUE,
      },
    });

    const overduePeriods = await this.prisma.billingPeriod.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: BillingPeriodStatus.OPEN,
        dueDate: {
          lt: new Date(),
        },
        assessments: {
          some: {
            deletedAt: null,
            status: AssessmentStatus.OVERDUE,
          },
        },
      },
      select: { id: true },
    });

    for (const period of overduePeriods) {
      await this.prisma.billingPeriod.update({
        where: { id: period.id },
        data: { status: BillingPeriodStatus.OVERDUE },
      });
    }
  }
}

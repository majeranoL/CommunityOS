import { Injectable } from '@nestjs/common';

import { AssessmentStatus, PaymentStatus } from '@prisma/client';

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

  if (status === AssessmentStatus.CANCELLED) {
    return AssessmentStatus.CANCELLED;
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
  // from its CONFIRMED payments. Mirrors the
  // balance shown in the household ledger.
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

    const confirmed = await this.prisma.payment.aggregate({
      where: {
        communityId,
        assessmentId,
        deletedAt: null,
        status: PaymentStatus.CONFIRMED,
      },
      _sum: {
        amount: true,
      },
    });

    const paidAmount = confirmed._sum.amount
      ? confirmed._sum.amount.toNumber()
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
  // Lazy OVERDUE sweep: flip issued / partially
  // paid assessments past their due date to OVERDUE.
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
  }
}

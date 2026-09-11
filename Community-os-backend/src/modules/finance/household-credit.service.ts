import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  HouseholdCreditApplicationSource,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

type CreditTx = Pick<
  Prisma.TransactionClient,
  | 'householdCredit'
  | 'paymentAllocation'
  | 'householdCreditApplication'
  | 'assessment'
  | 'household'
  | 'payment'
  | 'resident'
  | 'constructionRequest'
>;

export interface CreditApplicationResult {
  applied: number;
  applications: { creditId: string; amount: number }[];
}

/**
 * Shared engine for household credit lifecycle.
 *
 * Credits are bookkeeping remnants of an already-verified payment (or a
 * manually issued credit backed by a synthetic VERIFIED payment). Applying a
 * credit to an assessment works by allocating from the credit's *source*
 * payment - so the existing `FinanceSyncService` accounting (paidAmount =
 * sum of non-reversed allocations on verified payments) stays correct without
 * any new cash movement. Every application is recorded in
 * `HouseholdCreditApplication` so it can be reversed (and the balance
 * restored) when the payment that consumed it is rejected/cancelled/refunded.
 */
@Injectable()
export class HouseholdCreditService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Facade methods (single PrismaService client)
  // ==========================================

  async list(where: { communityId: string; householdId?: string }) {
    return this.listCredits(this.prisma, where);
  }

  async availableFor(
    communityId: string,
    householdId: string,
  ): Promise<number> {
    return this.availableBalance(this.prisma, communityId, householdId);
  }

  async issue(params: {
    communityId: string;
    householdId: string;
    amount: number;
    actorId?: string;
    reason?: string;
    constructionRequestId?: string;
    referenceNumber?: string;
  }) {
    return this.prisma.$transaction((tx) => this.issueCredit(tx, params));
  }

  async adjust(params: {
    communityId: string;
    creditId: string;
    amount: number;
  }) {
    return this.prisma.$transaction((tx) => this.updateBalance(tx, params));
  }

  async void(params: {
    communityId: string;
    creditId: string;
    actorId?: string;
  }): Promise<{ assessmentIds: string[] }> {
    return this.prisma.$transaction((tx) => this.voidCredit(tx, params));
  }

  async apply(params: {
    communityId: string;
    householdId: string;
    actorId?: string;
    items: { assessmentId: string; amount?: number }[];
  }) {
    return this.prisma.$transaction((tx) => this.applyManual(tx, params));
  }

  /** Sum of currently-available (positive) credit for a household. */
  async availableBalance(
    tx: CreditTx,
    communityId: string,
    householdId: string,
  ): Promise<number> {
    const rows = await tx.householdCredit.findMany({
      where: { communityId, householdId, balance: { gt: 0 } },
      select: { balance: true },
    });
    return rows.reduce((sum, row) => sum + row.balance.toNumber(), 0);
  }

  private readonly creditInclude = {
    community: {
      select: { id: true, displayName: true, slug: true },
    },
    household: {
      select: { id: true, block: true, lot: true, unit: true, address: true },
    },
    sourcePayment: {
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        isCreditIssue: true,
        status: true,
      },
    },
    request: {
      select: { id: true, requestNumber: true, title: true },
    },
    creditApplications: {
      include: {
        assessment: {
          select: {
            id: true,
            assessmentNumber: true,
            title: true,
            amount: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 50,
    },
  } satisfies Prisma.HouseholdCreditInclude;

  async listCredits(
    tx: CreditTx,
    where: { communityId: string; householdId?: string },
  ) {
    return tx.householdCredit.findMany({
      where: {
        communityId: where.communityId,
        ...(where.householdId ? { householdId: where.householdId } : {}),
      },
      include: this.creditInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Apply up to `amount` of a household's credit to one assessment (FIFO).
   * Runs inside the caller's transaction/client. Returns what was actually
   * applied so callers can persist/sync the remainder.
   *
   * When the credit was created without a source payment in the surrounding
   * accounting model, the credit is skipped to avoid desyncing paidAmount.
   */
  async applyToAssessment(
    tx: CreditTx,
    params: {
      communityId: string;
      householdId: string;
      assessmentId: string;
      amount: number;
      source: HouseholdCreditApplicationSource;
      paymentId?: string;
    },
  ): Promise<CreditApplicationResult> {
    const { communityId, householdId, assessmentId, amount, source } = params;
    if (amount <= 0) return { applied: 0, applications: [] };

    const credits = await tx.householdCredit.findMany({
      where: {
        communityId,
        householdId,
        balance: { gt: 0 },
        sourcePaymentId: { not: null },
      },
      orderBy: { createdAt: 'asc' },
    });

    const applications: { creditId: string; amount: number }[] = [];
    let remaining = Math.max(amount, 0);

    for (const credit of credits) {
      if (remaining <= 0) break;
      const balance = credit.balance.toNumber();
      const applied = Math.min(balance, remaining);
      if (applied <= 0) continue;

      if (credit.sourcePaymentId) {
        await tx.paymentAllocation.upsert({
          where: {
            paymentId_assessmentId: {
              paymentId: credit.sourcePaymentId,
              assessmentId,
            },
          },
          create: {
            communityId,
            paymentId: credit.sourcePaymentId,
            assessmentId,
            allocatedAmount: applied,
          },
          update: {
            allocatedAmount: { increment: applied },
          },
        });
      }

      await tx.householdCreditApplication.create({
        data: {
          communityId,
          householdId,
          creditId: credit.id,
          assessmentId,
          paymentId: params.paymentId,
          amount: applied,
          source,
        },
      });

      await tx.householdCredit.update({
        where: { id: credit.id },
        data: { balance: { decrement: applied } },
      });

      applications.push({ creditId: credit.id, amount: applied });
      remaining -= applied;
    }

    return {
      applied: applications.reduce((sum, app) => sum + app.amount, 0),
      applications,
    };
  }

  /**
   * Reverse every credit application tied to a payment (reject/cancel/refund/
   * delete/gateway failure). Restores the credit balances and reverses the
   * associated per-source-payment allocations. Returns the assessment ids the
   * caller should re-sync.
   */
  async reverseForPayment(
    tx: CreditTx,
    paymentId: string,
    actorId?: string,
    communityId?: string,
  ): Promise<{ assessmentIds: string[] }> {
    const apps = await tx.householdCreditApplication.findMany({
      where: {
        paymentId,
        reversedAt: null,
        ...(communityId ? { communityId } : {}),
      },
      include: { credit: { select: { sourcePaymentId: true } } },
    });
    if (!apps.length) return { assessmentIds: [] };

    const assessmentIds = new Set<string>();
    for (const app of apps) {
      await tx.householdCredit.update({
        where: { id: app.creditId },
        data: { balance: { increment: app.amount.toNumber() } },
      });
      if (app.credit.sourcePaymentId) {
        await tx.paymentAllocation.updateMany({
          where: {
            paymentId: app.credit.sourcePaymentId,
            assessmentId: app.assessmentId,
            reversedAt: null,
          },
          data: { reversedAt: new Date() },
        });
      }
      await tx.householdCreditApplication.update({
        where: { id: app.id },
        data: {
          reversedAt: new Date(),
          reversedById: actorId,
        },
      });
      assessmentIds.add(app.assessmentId);
    }
    return { assessmentIds: Array.from(assessmentIds) };
  }

  /**
   * Reverse every application tied to a *credit* (used when an officer voids a
   * manually issued credit). Restores balances, reverses the source-payment
   * allocations, and marks the applications reversed.
   */
  async reverseForCredit(
    tx: CreditTx,
    creditId: string,
    actorId?: string,
  ): Promise<{ assessmentIds: string[] }> {
    const apps = await tx.householdCreditApplication.findMany({
      where: { creditId, reversedAt: null },
      include: { credit: { select: { sourcePaymentId: true } } },
    });
    if (!apps.length) return { assessmentIds: [] };

    const assessmentIds = new Set<string>();
    for (const app of apps) {
      if (app.credit.sourcePaymentId) {
        await tx.paymentAllocation.updateMany({
          where: {
            paymentId: app.credit.sourcePaymentId,
            assessmentId: app.assessmentId,
            reversedAt: null,
          },
          data: { reversedAt: new Date() },
        });
      }
      await tx.householdCreditApplication.update({
        where: { id: app.id },
        data: {
          reversedAt: new Date(),
          reversedById: actorId,
        },
      });
      assessmentIds.add(app.assessmentId);
    }
    return { assessmentIds: Array.from(assessmentIds) };
  }

  /** Compute an assessment's outstanding collectible (post discount, post payments). */
  private collectible(assessment: {
    amount: { toNumber(): number };
    discountAmount: { toNumber(): number };
    paidAmount: { toNumber(): number };
  }): number {
    return Math.max(
      assessment.amount.toNumber() -
        assessment.discountAmount.toNumber() -
        assessment.paidAmount.toNumber(),
      0,
    );
  }

  /**
   * Settle outstanding assessments with a household's credit (officer
   * direct-apply flow). Accepts explicit allocations, or assessment ids that
   * are covered to the extent credit allows. Throws if any explicit amount
   * exceeds the assessment's outstanding balance. Returns per-assessment
   * applied amounts and the total applied.
   */
  async applyManual(
    tx: CreditTx,
    params: {
      communityId: string;
      householdId: string;
      items: { assessmentId: string; amount?: number }[];
      actorId?: string;
    },
  ) {
    const { communityId, householdId, items } = params;
    if (!items.length) {
      throw new BadRequestException(
        'Select at least one assessment to apply credit to.',
      );
    }

    const assessments = await tx.assessment.findMany({
      where: {
        id: { in: items.map((item) => item.assessmentId) },
        communityId,
        householdId,
        deletedAt: null,
        status: {
          in: [
            AssessmentStatus.ISSUED,
            AssessmentStatus.PARTIALLY_PAID,
            AssessmentStatus.OVERDUE,
          ],
        },
      },
      select: {
        id: true,
        amount: true,
        discountAmount: true,
        paidAmount: true,
      },
    });

    if (assessments.length !== items.length) {
      throw new BadRequestException(
        'One or more assessments are not outstanding for this household.',
      );
    }

    const collectibles = new Map(
      assessments.map((assessment) => [
        assessment.id,
        this.collectible(assessment),
      ]),
    );

    const appliedByAssessment: { assessmentId: string; applied: number }[] = [];
    let totalApplied = 0;

    for (const item of items) {
      const collectible = collectibles.get(item.assessmentId) ?? 0;
      if (collectible <= 0) {
        throw new BadRequestException(
          `Assessment ${item.assessmentId} has no outstanding balance.`,
        );
      }
      const requested = item.amount ?? collectible;
      if (requested > collectible + 0.005) {
        throw new BadRequestException(
          `Requested credit for an assessment exceeds its outstanding balance.`,
        );
      }
      const result = await this.applyToAssessment(tx, {
        communityId,
        householdId,
        assessmentId: item.assessmentId,
        amount: Math.min(requested, collectible),
        source: HouseholdCreditApplicationSource.MANUAL,
      });
      appliedByAssessment.push({
        assessmentId: item.assessmentId,
        applied: result.applied,
      });
      totalApplied += result.applied;
    }

    return { totalApplied, appliedByAssessment };
  }

  /** Void a credit line: reverse active applications and zero the balance. */
  async voidCredit(
    tx: CreditTx,
    params: {
      communityId: string;
      creditId: string;
      actorId?: string;
    },
  ): Promise<{ assessmentIds: string[] }> {
    const { communityId, creditId, actorId } = params;
    const credit = await tx.householdCredit.findFirst({
      where: { id: creditId, communityId },
      select: {
        id: true,
        balance: true,
        sourcePaymentId: true,
        householdId: true,
      },
    });
    if (!credit) {
      throw new NotFoundException('Household credit not found.');
    }

    const { assessmentIds } = await this.reverseForCredit(
      tx,
      creditId,
      actorId,
    );

    if (credit.balance.toNumber() > 0) {
      await tx.householdCredit.update({
        where: { id: credit.id },
        data: { balance: 0 },
      });
    }

    if (credit.sourcePaymentId) {
      // Only synthetic issue payments are refunded; advance-remainder credits
      // backed by real verified payments are untouched.
      await tx.payment.updateMany({
        where: { id: credit.sourcePaymentId, isCreditIssue: true },
        data: {
          status: PaymentStatus.REFUNDED,
          refundedById: actorId,
          refundedAt: new Date(),
        },
      });
    }

    return { assessmentIds };
  }

  /**
   * Issue a manual credit for a household. Backed by a synthetic VERIFIED
   * "credit issue" payment so existing finance accounting (paidAmount via
   * verified payment allocations, and the issuance appearing in payment
   * history as an OTHER credit payment) stays consistent.
   */
  async issueCredit(
    tx: CreditTx,
    params: {
      communityId: string;
      householdId: string;
      amount: number;
      actorId?: string;
      reason?: string;
      constructionRequestId?: string;
      referenceNumber?: string;
    },
  ) {
    const {
      communityId,
      householdId,
      amount,
      reason,
      constructionRequestId,
      referenceNumber,
    } = params;

    const household = await tx.household.findFirst({
      where: { id: householdId, communityId, deletedAt: null },
      select: {
        id: true,
        primaryResidents: {
          where: { deletedAt: null },
          take: 1,
          select: { id: true },
        },
        residents: {
          where: { deletedAt: null },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!household) {
      throw new BadRequestException('Household not found in this community.');
    }
    const residentId =
      household.primaryResidents[0]?.id ?? household.residents[0]?.id;
    if (!residentId) {
      throw new BadRequestException(
        'Household has no resident to attach the credit payment to.',
      );
    }

    if (constructionRequestId) {
      const request = await tx.constructionRequest.findFirst({
        where: {
          id: constructionRequestId,
          communityId,
          householdId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!request) {
        throw new BadRequestException(
          'Construction request not found for this household.',
        );
      }
      const existing = await tx.householdCredit.findFirst({
        where: { requestId: constructionRequestId },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException(
          'A credit has already been issued for this construction request.',
        );
      }
    }

    const lastPayment = await tx.payment.findFirst({
      where: { communityId },
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });
    let nextNumber = 0;
    if (lastPayment) {
      const parsed = parseInt(
        lastPayment.paymentNumber.replace(/^PAY-/, ''),
        10,
      );
      if (!Number.isNaN(parsed)) nextNumber = parsed;
    }
    const paymentNumber = `PAY-${String(nextNumber + 1).padStart(6, '0')}`;

    const payment = await tx.payment.create({
      data: {
        communityId,
        paymentNumber,
        residentId,
        amount,
        paymentDate: new Date(),
        method: PaymentMethod.OTHER,
        referenceNumber: referenceNumber ?? `CREDIT-${paymentNumber}`,
        remarks: reason ?? 'Household credit issuance',
        status: PaymentStatus.VERIFIED,
        paidAt: new Date(),
        verifiedAt: new Date(),
        isCreditIssue: true,
      },
    });

    const credit = await tx.householdCredit.create({
      data: {
        communityId,
        householdId,
        balance: amount,
        sourcePaymentId: payment.id,
        requestId: constructionRequestId ?? null,
      },
    });

    return credit;
  }

  /** Set a credit line's available balance (officer adjustment). */
  async updateBalance(
    tx: CreditTx,
    params: { communityId: string; creditId: string; amount: number },
  ) {
    const { communityId, creditId, amount } = params;
    const credit = await tx.householdCredit.findFirst({
      where: { id: creditId, communityId },
      select: { id: true },
    });
    if (!credit) {
      throw new NotFoundException('Household credit not found.');
    }
    return tx.householdCredit.update({
      where: { id: credit.id },
      data: { balance: amount },
    });
  }
}

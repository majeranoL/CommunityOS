import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  AssessmentStatus,
  ChargeRecurrence,
  CommunityStatus,
  HouseholdCreditApplicationSource,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { FeaturesService } from '../features/features.service';
import { HOUSEHOLD_CREDIT_FEATURE } from '../features/feature.constants';

import { FinanceSyncService } from './finance-sync.service';
import { HouseholdCreditService } from './household-credit.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RejectPaymentDto } from './dto/payment-review.dto';

import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';
import { allocateAdvanceAmount } from './advance-payment-allocation';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly financeSyncService: FinanceSyncService,
    private readonly gateway: PaymentsGatewayService,
    private readonly householdCreditService: HouseholdCreditService,
    private readonly featuresService: FeaturesService,
  ) {}

  // ==========================================
  // Create Payment (always starts PENDING_VERIFICATION)
  // ==========================================

  private async nextPaymentNumber(communityId: string): Promise<string> {
    const latest = await this.prisma.payment.findFirst({
      where: { communityId },
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });

    let nextNumber = 0;

    if (latest) {
      const parsed = parseInt(latest.paymentNumber.replace(/^PAY-/, ''), 10);

      if (!Number.isNaN(parsed)) nextNumber = parsed;
    }

    return `PAY-${String(nextNumber + 1).padStart(6, '0')}`;
  }

  async create(communityId: string, dto: CreatePaymentDto) {
    // ==========================================
    // Auto-generate Payment Number
    // ==========================================

    const paymentNumber = await this.nextPaymentNumber(communityId);

    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.referenceNumber = dto.referenceNumber?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Validate Resident
    // ==========================================

    const resident = await this.prisma.resident.findFirst({
      where: {
        id: dto.residentId,
        communityId,
        deletedAt: null,
      },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }

    if (!resident.householdId) {
      throw new BadRequestException('Resident is not linked to a household.');
    }

    // ==========================================
    // Resolve target assessments
    // ==========================================

    const { targets, chargeTypeId } = await this.resolveTargets(
      communityId,
      dto,
      resident.householdId,
    );

    const isAdvance = Boolean(dto.advanceMonths);
    if (isAdvance) {
      const enabled = await this.featuresService.isEnabled(
        communityId,
        HOUSEHOLD_CREDIT_FEATURE,
      );
      if (!enabled) {
        throw new BadRequestException(
          'Advance payments are not enabled for this community.',
        );
      }
    }
    if (targets.length === 0 && !isAdvance) {
      throw new BadRequestException(
        'Select at least one assessment or billing period to pay for.',
      );
    }

    const allocatedTotal = targets.reduce(
      (sum, target) => sum + target.amount,
      0,
    );

    // ==========================================
    // Apply household credit toward the selected items
    // ==========================================

    const applyCredit = dto.applyCredit === true && !isAdvance;
    const availableCredit = applyCredit
      ? await this.householdCreditService.availableBalance(
          this.prisma,
          communityId,
          resident.householdId,
        )
      : 0;
    const creditApplied = Math.min(availableCredit, allocatedTotal);

    // The resident pays only the portion not covered by credit.
    const payable = Math.max(allocatedTotal - creditApplied, 0);

    // Allow small rounding tolerance (e.g. 1200.0000001)
    if (Math.abs(payable - dto.amount) > 0.005) {
      throw new BadRequestException(
        `Payment amount must equal the sum of selected items after applying credit (${payable.toFixed(
          2,
        )}).`,
      );
    }

    // ==========================================
    // Require proof for wallet payments
    // ==========================================

    if (
      (dto.method === 'GCASH' || dto.method === 'MAYA') &&
      !dto.proofFileId &&
      !dto.proofUrl
    ) {
      throw new BadRequestException(
        'A proof screenshot is required for GCash/Maya payments.',
      );
    }

    // ==========================================
    // Create Payment + Allocations
    // ==========================================

    // Spread credit across targets (FIFO) so the payment's own allocations
    // only cover the cash remainder. The credit portions are allocated from
    // the credit's source payment (see applyToAssessment).
    const creditPerTarget = new Map<string, number>();
    let creditRemaining = creditApplied;
    for (const target of targets) {
      if (creditRemaining <= 0) break;
      const covered = Math.min(target.amount, creditRemaining);
      creditPerTarget.set(target.assessmentId, covered);
      creditRemaining -= covered;
    }

    const { payment, creditAppliedTotal } = await this.prisma.$transaction(
      async (tx) => {
        const created = await tx.payment.create({
          data: {
            communityId,

            paymentNumber,
            residentId: dto.residentId,
            amount: dto.amount,
            paymentDate: new Date(dto.paymentDate),
            method: dto.method ?? 'CASH',
            referenceNumber: dto.referenceNumber,
            remarks: dto.remarks,
            proofFileId: dto.proofFileId,
            proofUrl: dto.proofUrl,
            chargeTypeId: chargeTypeId ?? dto.chargeTypeId,

            status: PaymentStatus.PENDING_VERIFICATION,
            isAdvance,
            advanceMonths: dto.advanceMonths,

            allocations: {
              create: targets
                .map((target) => {
                  const creditCovered =
                    creditPerTarget.get(target.assessmentId) ?? 0;
                  const cashPortion = Math.max(
                    target.amount - creditCovered,
                    0,
                  );
                  if (cashPortion <= 0) return null;
                  return {
                    communityId,
                    assessmentId: target.assessmentId,
                    allocatedAmount: cashPortion,
                  };
                })
                .filter(
                  (allocation): allocation is NonNullable<typeof allocation> =>
                    allocation !== null,
                ),
            },
          },

          include: {
            allocations: {
              include: {
                assessment: {
                  select: {
                    id: true,
                    assessmentNumber: true,
                    title: true,
                  },
                },
              },
            },
            resident: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        let appliedTotal = 0;
        for (const target of targets) {
          const creditCovered = creditPerTarget.get(target.assessmentId) ?? 0;
          if (creditCovered <= 0) continue;
          const applied = await this.householdCreditService.applyToAssessment(
            tx,
            {
              communityId,
              householdId: resident.householdId!,
              assessmentId: target.assessmentId,
              amount: creditCovered,
              source: HouseholdCreditApplicationSource.PAYMENT,
              paymentId: created.id,
            },
          );
          appliedTotal += applied.applied;
        }

        return { payment: created, creditAppliedTotal: appliedTotal };
      },
    );

    // ==========================================
    // Notify Finance Staff
    // ==========================================

    const financeUserIds =
      await this.notificationsService.userIdsWithPermission(
        communityId,
        'finance.verify',
      );

    await this.notificationsService.dispatchMany(
      communityId,
      financeUserIds,
      NotificationType.PAYMENT,
      `New payment ${payment.paymentNumber} awaiting verification`,
      `${payment.resident.firstName} ${payment.resident.lastName} recorded a payment of ${Number(
        payment.amount,
      )} pending verification.`,
      `/payments/${payment.id}`,
    );

    return {
      success: true,
      message:
        creditAppliedTotal > 0
          ? `Payment recorded and awaiting verification. Applied ${Number(
              creditAppliedTotal,
            )} in household credit.`
          : 'Payment recorded and awaiting verification.',
      data: payment,
    };
  }

  // ==========================================
  // Create a Gateway (online) Checkout for resident dues
  // ==========================================

  async createGatewayCheckout(communityId: string, dto: CreatePaymentDto) {
    const communityGateway =
      await this.prisma.communityPayMongoAccount.findUnique({
        where: { communityId },
      });

    if (!communityGateway?.isActive) {
      throw new BadRequestException(
        'This community has not configured its PayMongo account.',
      );
    }

    // ==========================================
    // Validate Resident
    // ==========================================

    const resident = await this.prisma.resident.findFirst({
      where: { id: dto.residentId, communityId, deletedAt: null },
    });

    if (!resident) {
      throw new NotFoundException('Resident not found.');
    }
    if (!resident.householdId) {
      throw new BadRequestException('Resident is not linked to a household.');
    }

    // ==========================================
    // Resolve target assessments
    // ==========================================

    const { targets, chargeTypeId } = await this.resolveTargets(
      communityId,
      dto,
      resident.householdId,
    );

    if (targets.length === 0) {
      throw new BadRequestException(
        'Select at least one assessment or billing period to pay for.',
      );
    }

    const allocatedTotal = targets.reduce((sum, t) => sum + t.amount, 0);

    // ==========================================
    // Apply household credit toward the selected items
    // ==========================================

    const applyCredit = dto.applyCredit === true;
    const availableCredit = applyCredit
      ? await this.householdCreditService.availableBalance(
          this.prisma,
          communityId,
          resident.householdId,
        )
      : 0;
    const creditApplied = Math.min(availableCredit, allocatedTotal);
    const payable = Math.max(allocatedTotal - creditApplied, 0);

    if (payable <= 0) {
      // Nothing left to charge - settle the items entirely with credit.
      await this.prisma.$transaction(async (tx) => {
        for (const target of targets) {
          await this.householdCreditService.applyToAssessment(tx, {
            communityId,
            householdId: resident.householdId!,
            assessmentId: target.assessmentId,
            amount: target.amount,
            source: HouseholdCreditApplicationSource.PAYMENT,
          });
        }
      });
      return {
        success: true,
        message: 'Selected items were fully covered by household credit.',
        data: { settledByCredit: true },
      };
    }

    if (Math.abs(payable - dto.amount) > 0.005) {
      throw new BadRequestException(
        `Amount to charge must equal the sum of selected items after applying credit (${payable.toFixed(
          2,
        )}).`,
      );
    }

    const creditPerTarget = new Map<string, number>();
    let creditRemaining = creditApplied;
    for (const target of targets) {
      if (creditRemaining <= 0) break;
      const covered = Math.min(target.amount, creditRemaining);
      creditPerTarget.set(target.assessmentId, covered);
      creditRemaining -= covered;
    }

    // ==========================================
    // Create Payment in PROCESSING state
    // ==========================================

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          communityId,
          paymentNumber: await this.nextPaymentNumber(communityId),
          residentId: dto.residentId,
          amount: dto.amount,
          paymentDate: new Date(),
          method: PaymentMethod.ONLINE,
          referenceNumber: dto.referenceNumber,
          remarks: dto.remarks,
          chargeTypeId: chargeTypeId ?? dto.chargeTypeId,
          status: PaymentStatus.PROCESSING,
          gatewayProvider: 'paymongo',
          allocations: {
            create: targets
              .map((target) => {
                const creditCovered =
                  creditPerTarget.get(target.assessmentId) ?? 0;
                const cashPortion = Math.max(target.amount - creditCovered, 0);
                if (cashPortion <= 0) return null;
                return {
                  communityId,
                  assessmentId: target.assessmentId,
                  allocatedAmount: cashPortion,
                };
              })
              .filter(
                (allocation): allocation is NonNullable<typeof allocation> =>
                  allocation !== null,
              ),
          },
        },
      });

      for (const target of targets) {
        const creditCovered = creditPerTarget.get(target.assessmentId) ?? 0;
        if (creditCovered <= 0) continue;
        await this.householdCreditService.applyToAssessment(tx, {
          communityId,
          householdId: resident.householdId!,
          assessmentId: target.assessmentId,
          amount: creditCovered,
          source: HouseholdCreditApplicationSource.PAYMENT,
          paymentId: created.id,
        });
      }

      return created;
    });

    // ==========================================
    // Create gateway checkout session
    // ==========================================

    const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(
      /\/+$/,
      '',
    );

    let checkout: Awaited<ReturnType<PaymentsGatewayService['createCheckout']>>;
    try {
      checkout = await this.gateway.createCheckout(
        {
          amount: Number(dto.amount),
          currency: 'PHP',
          description: 'HOA dues payment',
          successUrl: `${appUrl}/app/finance?tab=my-payments`,
          failureUrl: `${appUrl}/app/finance?tab=my-dues`,
          metadata: {
            paymentId: payment.id,
            communityId,
            type: 'payment',
          },
        },
        communityGateway.secretKey,
      );
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw error;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayId: checkout.gatewayId,
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return {
      success: true,
      message: 'Checkout created. Redirect the resident to the checkout URL.',
      data: {
        paymentId: payment.id,
        checkoutUrl: checkout.checkoutUrl,
        gatewayId: checkout.gatewayId,
      },
    };
  }

  async isCommunityGatewayEnabled(communityId: string) {
    const account = await this.prisma.communityPayMongoAccount.findUnique({
      where: { communityId },
      select: { isActive: true },
    });

    return account?.isActive === true;
  }

  // ==========================================
  // Gateway webhook transitions (verified by gateway module)
  // ==========================================

  private async reactivateCommunityIfInactive(communityId: string) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
    });

    if (
      !community ||
      community.status !== CommunityStatus.INACTIVE ||
      community.suspensionReason !== 'unpaid'
    ) {
      return;
    }

    await this.prisma.community.update({
      where: { id: communityId },
      data: {
        status: CommunityStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null,
      },
    });
  }

  async markGatewaySucceeded(gatewayId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayId: gatewayId, deletedAt: null },
    });

    return this.markGatewaySucceededForPayment(payment);
  }

  async markGatewaySucceededByPaymentId(paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, deletedAt: null },
    });

    return this.markGatewaySucceededForPayment(payment);
  }

  private async markGatewaySucceededForPayment(payment: any) {
    if (!payment) {
      return { success: false, reason: 'NOT_FOUND' };
    }
    if (payment.status !== PaymentStatus.PROCESSING) {
      return { success: false, reason: 'ALREADY_FINAL' };
    }

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.VERIFIED,
        paidAt: new Date(),
      },
      include: {
        allocations: true,
        resident: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.syncLinkedAssessments(payment.communityId, payment.id);
    await this.activateConstructionBondsForPayment(payment.id);
    await this.reactivateCommunityIfInactive(payment.communityId);
    await this.notifyResident(
      payment.communityId,
      payment.residentId,
      `Payment ${payment.paymentNumber} verified`,
      `Your online payment of ${Number(payment.amount)} was successful.`,
      `/payments/${payment.id}`,
    );

    return { success: true, payment: updated };
  }

  async markGatewayFailed(gatewayId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayId: gatewayId, deletedAt: null },
    });
    if (!payment) {
      return { success: false, reason: 'NOT_FOUND' };
    }
    if (payment.status !== PaymentStatus.PROCESSING) {
      return { success: false, reason: 'ALREADY_FINAL' };
    }

    await this.reverseAllocations(payment.communityId, payment.id);
    const { assessmentIds: creditAssessmentIds } =
      await this.householdCreditService.reverseForPayment(
        this.prisma,
        payment.id,
        undefined,
        payment.communityId,
      );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
    });
    await this.syncLinkedAssessments(
      payment.communityId,
      payment.id,
      creditAssessmentIds,
    );

    return { success: true };
  }

  async markGatewayExpired(gatewayId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayId: gatewayId, deletedAt: null },
    });
    if (!payment) {
      return { success: false, reason: 'NOT_FOUND' };
    }
    if (payment.status !== PaymentStatus.PROCESSING) {
      return { success: false, reason: 'ALREADY_FINAL' };
    }

    await this.reverseAllocations(payment.communityId, payment.id);
    const { assessmentIds: creditAssessmentIds } =
      await this.householdCreditService.reverseForPayment(
        this.prisma,
        payment.id,
        undefined,
        payment.communityId,
      );
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.EXPIRED },
    });
    await this.syncLinkedAssessments(
      payment.communityId,
      payment.id,
      creditAssessmentIds,
    );

    return { success: true };
  }

  // ==========================================
  // Gateway reconciliation (PROCESSING -> final)
  // ==========================================

  // Resolves a PROCESSING gateway payment against the wallet provider's
  // current checkout state. Paid => VERIFIED; otherwise EXPIRED. This is the
  // source of truth when a webhook was missed or a checkout was abandoned.
  async syncWithGateway(
    communityId: string,
    id: string,
    scopeHouseholdId?: string,
  ) {
    return this.settleGatewaySession(communityId, id, scopeHouseholdId);
  }

  private async settleGatewaySession(
    communityId: string,
    id: string,
    scopeHouseholdId?: string,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        resident: { select: { householdId: true } },
        community: {
          select: {
            paymongoAccount: {
              select: { secretKey: true, isActive: true },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    // IDOR guard: a member may only reconcile their own household's payment
    if (scopeHouseholdId && payment.resident.householdId !== scopeHouseholdId) {
      throw new NotFoundException('Payment not found.');
    }

    if (payment.status !== PaymentStatus.PROCESSING || !payment.gatewayId) {
      return {
        success: true,
        status: payment.status,
        reason: 'NOT_APPLICABLE',
      };
    }

    let checkout: Record<string, unknown>;
    try {
      checkout = await this.gateway.retrieveCheckout(
        payment.gatewayId,
        payment.community.paymongoAccount?.isActive
          ? payment.community.paymongoAccount.secretKey
          : undefined,
      );
    } catch {
      // Gateway unreachable. Leave the payment PROCESSING and retry later
      // rather than risking a wrongly-expired record for a paid session.
      return {
        success: false,
        reason: 'GATEWAY_UNREACHABLE',
        status: payment.status,
      };
    }

    if (this.isCheckoutPaid(checkout)) {
      await this.markGatewaySucceeded(payment.gatewayId);
    } else if (this.isCheckoutFinalizedUnpaid(checkout)) {
      await this.markGatewayExpired(payment.gatewayId);
    } else {
      return {
        success: false,
        reason: 'GATEWAY_PENDING',
        status: payment.status,
      };
    }

    const updated = await this.prisma.payment.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });

    return {
      success: true,
      reason: this.isCheckoutPaid(checkout) ? 'PAID' : 'EXPIRED',
      status: updated?.status ?? payment.status,
    };
  }

  private isCheckoutPaid(checkout: Record<string, unknown>): boolean {
    const attributes = (checkout as { data?: { attributes?: any } })?.data
      ?.attributes;
    return (
      this.containsPaymentStatus(attributes, new Set(['paid', 'succeeded'])) ||
      attributes?.paid === true
    );
  }

  private isCheckoutFinalizedUnpaid(
    checkout: Record<string, unknown>,
  ): boolean {
    const attributes = (checkout as { data?: { attributes?: any } })?.data
      ?.attributes;
    return this.containsPaymentStatus(
      attributes,
      new Set(['expired', 'failed', 'payment_failed']),
    );
  }

  private containsPaymentStatus(
    value: unknown,
    statuses: Set<string>,
  ): boolean {
    if (!value || typeof value !== 'object') return false;
    if (Array.isArray(value)) {
      return value.some((item) => this.containsPaymentStatus(item, statuses));
    }

    const record = value as Record<string, unknown>;
    if (
      typeof record.status === 'string' &&
      statuses.has(record.status.toLowerCase())
    ) {
      return true;
    }

    return Object.values(record).some((item) =>
      this.containsPaymentStatus(item, statuses),
    );
  }

  // ==========================================
  // Abandoned-gateway sweep
  // ==========================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepExpiredGatewayPayments() {
    const stale = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PROCESSING,
        gatewayProvider: 'paymongo',
        gatewayId: { not: null },
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
      select: { id: true, communityId: true },
    });

    for (const payment of stale) {
      try {
        await this.settleGatewaySession(payment.communityId, payment.id);
      } catch (error) {
        // Individual failures must not block the rest of the sweep.
        console.error(
          `Sweep: failed to reconcile payment ${payment.id}:`,
          error,
        );
      }
    }
  }

  // ==========================================
  // Get All Payments
  // ==========================================

  async findAll(
    communityId: string,
    query: PaymentQueryDto,
    scopeHouseholdId?: string,
  ) {
    const {
      page,
      limit,
      search,
      status,
      method,
      assessmentId,
      residentId,
      category,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          paymentNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          referenceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          resident: {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (method) {
      where.method = method;
    }

    if (assessmentId) {
      where.allocations = {
        some: {
          assessmentId,
        },
      };
    }

    if (residentId) {
      where.residentId = residentId;
    }

    if (category) {
      where.OR = where.OR ?? [];
      where.OR.push({
        chargeType: {
          category,
        },
      });
    }

    // Household scoping: a member sees only payments from their own
    // household's residents
    if (scopeHouseholdId) {
      where.resident = {
        householdId: scopeHouseholdId,
      };
    }

    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          verifiedBy: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
            },
          },
          chargeType: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          allocations: {
            include: {
              assessment: {
                select: {
                  id: true,
                  assessmentNumber: true,
                  title: true,
                  period: true,
                },
              },
            },
          },
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.payment.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Payments retrieved successfully.',
      data: payments,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // ==========================================
  // Get Payment By ID (household-scoped when needed)
  // ==========================================

  async findOne(communityId: string, id: string, scopeHouseholdId?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        chargeType: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        allocations: {
          include: {
            assessment: {
              select: {
                id: true,
                assessmentNumber: true,
                title: true,
                period: true,
              },
            },
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            householdId: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        rejectedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        refundedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    // IDOR guard: a member may only read payments belonging to their
    // own household
    if (scopeHouseholdId && payment.resident.householdId !== scopeHouseholdId) {
      throw new NotFoundException('Payment not found.');
    }

    return {
      success: true,
      message: 'Payment retrieved successfully.',
      data: payment,
    };
  }

  // ==========================================
  // Payment Receipt
  // ==========================================

  async receipt(communityId: string, id: string, scopeHouseholdId?: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        chargeType: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        allocations: {
          include: {
            assessment: {
              select: {
                id: true,
                assessmentNumber: true,
                title: true,
                period: true,
              },
            },
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            suffix: true,
            householdId: true,
            household: {
              select: {
                id: true,
                block: true,
                lot: true,
                unit: true,
                address: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    // IDOR guard: a member may only view receipts for their own household
    if (scopeHouseholdId && payment.resident.householdId !== scopeHouseholdId) {
      throw new NotFoundException('Payment not found.');
    }

    const community = await this.prisma.community.findFirst({
      where: { id: communityId },
      select: {
        displayName: true,
        address: true,
        contactNumber: true,
        email: true,
        logoUrl: true,
      },
    });

    return {
      success: true,
      message: 'Receipt generated successfully.',
      data: {
        payment,
        community,
      },
    };
  }

  // ==========================================
  // Update Payment (metadata only while pending)
  // ==========================================

  async update(communityId: string, id: string, dto: UpdatePaymentDto) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new ConflictException('Only pending payments can be edited.');
    }

    if (dto.residentId && dto.residentId !== payment.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }
    }

    // If the payment target changed, recompute allocations.
    const retarget = Boolean(
      dto.allocations || dto.billingPeriodIds || dto.assessmentId,
    );

    let chargeTypeId: string | null | undefined;
    if (retarget && dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: { id: dto.residentId, communityId, deletedAt: null },
      });

      if (resident && resident.householdId) {
        const { chargeTypeId: resolved } = await this.resolveTargets(
          communityId,
          dto as CreatePaymentDto,
          resident.householdId,
        );
        chargeTypeId = resolved;
      }
    }

    const data: any = {};

    if (dto.residentId) data.residentId = dto.residentId;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.paymentDate) data.paymentDate = new Date(dto.paymentDate);
    if (dto.method) data.method = dto.method;
    if (dto.referenceNumber !== undefined)
      data.referenceNumber = dto.referenceNumber;
    if (dto.remarks !== undefined) data.remarks = dto.remarks;
    if (dto.proofFileId !== undefined) data.proofFileId = dto.proofFileId;
    if (dto.proofUrl !== undefined) data.proofUrl = dto.proofUrl;
    if (chargeTypeId !== undefined) data.chargeTypeId = chargeTypeId;

    const targetMethod = dto.method ?? payment.method;
    const proofFileId = data.proofFileId ?? payment.proofFileId;
    const proofUrl = data.proofUrl ?? payment.proofUrl;
    if (
      (targetMethod === 'GCASH' || targetMethod === 'MAYA') &&
      !proofFileId &&
      !proofUrl
    ) {
      throw new BadRequestException(
        'A proof screenshot is required for GCash/Maya payments.',
      );
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data,
      include: {
        allocations: {
          include: {
            assessment: {
              select: {
                id: true,
                assessmentNumber: true,
                title: true,
                period: true,
              },
            },
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (retarget) {
      const resident = await this.prisma.resident.findFirst({
        where: { id: dto.residentId ?? payment.residentId, communityId },
      });

      if (resident && resident.householdId) {
        await this.replaceAllocations(
          communityId,
          id,
          dto as CreatePaymentDto,
          resident.householdId,
          dto.amount ?? payment.amount.toNumber(),
        );

        const refreshed = await this.prisma.payment.findUnique({
          where: { id },
          include: { allocations: true },
        });
        if (refreshed) {
          chargeTypeId = refreshed.chargeTypeId;
        }
      }
    }

    return {
      success: true,
      message: 'Payment updated successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Delete Payment (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    await this.reverseAllocations(communityId, id);
    await this.clearPaymentCredit(id);
    const { assessmentIds: creditAssessmentIds } =
      await this.householdCreditService.reverseForPayment(
        this.prisma,
        id,
        undefined,
        communityId,
      );

    await this.prisma.payment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    const assessmentIds = new Set([
      ...(await this.allocatedAssessmentIds(id)),
      ...creditAssessmentIds,
    ]);
    for (const assessmentId of assessmentIds) {
      await this.financeSyncService.syncAssessment(communityId, assessmentId);
    }

    return {
      success: true,
      message: 'Payment deleted successfully.',
    };
  }

  // ==========================================
  // Verify Payment
  // ==========================================

  async verify(communityId: string, id: string, userId: string) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        'Only PENDING_VERIFICATION payments can be verified.',
      );
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.VERIFIED,
        verifiedById: userId,
        verifiedAt: new Date(),
      },
      include: {
        allocations: true,
        resident: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (payment.isAdvance) {
      await this.allocateAdvancePayment(
        communityId,
        payment.id,
        payment.residentId,
        payment.amount.toNumber(),
      );
    }

    await this.syncLinkedAssessments(communityId, id);
    await this.activateConstructionBondsForPayment(id);

    await this.notifyResident(
      communityId,
      payment.residentId,
      `Payment ${payment.paymentNumber} verified`,
      `Your payment of ${Number(payment.amount)} has been verified.`,
      `/payments/${payment.id}`,
    );

    return {
      success: true,
      message: 'Payment verified and allocated successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Reject Payment (reason required)
  // ==========================================

  async reject(
    communityId: string,
    id: string,
    dto: RejectPaymentDto,
    userId: string,
  ) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new BadRequestException(
        'Only PENDING_VERIFICATION payments can be rejected.',
      );
    }

    await this.reverseAllocations(communityId, id);
    await this.clearPaymentCredit(id);
    const { assessmentIds: creditAssessmentIds } =
      await this.householdCreditService.reverseForPayment(
        this.prisma,
        id,
        userId,
        communityId,
      );

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REJECTED,
        rejectionReason: dto.reason.trim(),
        rejectedById: userId,
        rejectedAt: new Date(),
      },
      include: {
        allocations: true,
        resident: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.syncLinkedAssessments(communityId, id, creditAssessmentIds);

    await this.notifyResident(
      communityId,
      payment.residentId,
      `Payment ${payment.paymentNumber} rejected`,
      `Your payment of ${Number(payment.amount)} was rejected. Reason: ${
        dto.reason
      }`,
      `/payments/${payment.id}`,
    );

    return {
      success: true,
      message: 'Payment rejected.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Refund Payment
  // ==========================================

  async refund(communityId: string, id: string, userId: string) {
    const payment = await this.findScoped(communityId, id);

    if (payment.status !== PaymentStatus.VERIFIED) {
      throw new BadRequestException('Only VERIFIED payments can be refunded.');
    }

    await this.reverseAllocations(communityId, id);
    await this.clearPaymentCredit(id);
    const { assessmentIds: creditAssessmentIds } =
      await this.householdCreditService.reverseForPayment(
        this.prisma,
        id,
        userId,
        communityId,
      );

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.REFUNDED,
        refundedById: userId,
        refundedAt: new Date(),
      },
      include: {
        allocations: true,
        resident: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.syncLinkedAssessments(communityId, id, creditAssessmentIds);

    await this.notifyResident(
      communityId,
      payment.residentId,
      `Payment ${payment.paymentNumber} refunded`,
      `Your payment of ${Number(payment.amount)} has been refunded.`,
      `/payments/${payment.id}`,
    );

    return {
      success: true,
      message: 'Payment refunded successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Cancel Payment
  // ==========================================

  async cancel(communityId: string, id: string, userId: string) {
    const payment = await this.findScoped(communityId, id);

    if (
      payment.status !== PaymentStatus.PENDING_VERIFICATION &&
      payment.status !== PaymentStatus.VERIFIED
    ) {
      throw new BadRequestException(
        'Only pending or verified payments can be cancelled.',
      );
    }

    await this.reverseAllocations(communityId, id);
    await this.clearPaymentCredit(id);
    const { assessmentIds: creditAssessmentIds } =
      await this.householdCreditService.reverseForPayment(
        this.prisma,
        id,
        userId,
        communityId,
      );

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.CANCELLED,
        cancelledById: userId,
        cancelledAt: new Date(),
      },
      include: {
        allocations: true,
        resident: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.syncLinkedAssessments(communityId, id, creditAssessmentIds);

    await this.notifyResident(
      communityId,
      payment.residentId,
      `Payment ${payment.paymentNumber} cancelled`,
      `Your payment of ${Number(payment.amount)} has been cancelled.`,
      `/payments/${payment.id}`,
    );

    return {
      success: true,
      message: 'Payment cancelled successfully.',
      data: updatedPayment,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    return payment;
  }

  private async allocatedAssessmentIds(paymentId: string): Promise<string[]> {
    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { paymentId },
      select: { assessmentId: true },
    });
    return allocations.map((allocation) => allocation.assessmentId);
  }

  private async syncLinkedAssessments(
    communityId: string,
    paymentId: string,
    extraAssessmentIds: string[] = [],
  ) {
    const assessmentIds = new Set([
      ...(await this.allocatedAssessmentIds(paymentId)),
      ...extraAssessmentIds,
    ]);
    for (const assessmentId of assessmentIds) {
      await this.financeSyncService.syncAssessment(communityId, assessmentId);
    }
  }

  private async allocateAdvancePayment(
    communityId: string,
    paymentId: string,
    residentId: string,
    amount: number,
  ) {
    const resident = await this.prisma.resident.findFirst({
      where: { id: residentId, communityId, deletedAt: null },
      select: { householdId: true },
    });
    if (!resident?.householdId) return;
    const assessments = await this.prisma.assessment.findMany({
      where: {
        communityId,
        householdId: resident.householdId,
        deletedAt: null,
        status: {
          in: [
            AssessmentStatus.ISSUED,
            AssessmentStatus.PARTIALLY_PAID,
            AssessmentStatus.OVERDUE,
          ],
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
    const result = allocateAdvanceAmount(
      assessments.map((assessment) => ({
        id: assessment.id,
        dueDate: assessment.dueDate,
        createdAt: assessment.createdAt,
        collectible:
          assessment.amount.toNumber() -
          assessment.discountAmount.toNumber() -
          assessment.paidAmount.toNumber(),
      })),
      amount,
    );
    for (const allocation of result.allocations) {
      await this.prisma.paymentAllocation.create({
        data: {
          communityId,
          paymentId,
          assessmentId: allocation.assessmentId,
          allocatedAmount: allocation.amount,
        },
      });
      await this.financeSyncService.syncAssessment(
        communityId,
        allocation.assessmentId,
      );
    }
    if (result.remainder > 0) {
      await this.prisma.householdCredit.create({
        data: {
          communityId,
          householdId: resident.householdId,
          balance: result.remainder,
          sourcePaymentId: paymentId,
        },
      });
    }
  }

  private async reverseAllocations(communityId: string, paymentId: string) {
    await this.prisma.paymentAllocation.updateMany({
      where: {
        communityId,
        paymentId,
        reversedAt: null,
      },
      data: {
        reversedAt: new Date(),
      },
    });
  }

  private async clearPaymentCredit(paymentId: string) {
    await this.prisma.householdCredit.updateMany({
      where: { sourcePaymentId: paymentId, balance: { gt: 0 } },
      data: { balance: 0 },
    });
  }

  private async activateConstructionBondsForPayment(paymentId: string) {
    const allocations = await this.prisma.paymentAllocation.findMany({
      where: { paymentId, reversedAt: null },
      include: {
        assessment: { select: { constructionBond: { select: { id: true } } } },
      },
    });
    const bondIds = allocations
      .map((allocation) => allocation.assessment.constructionBond?.id)
      .filter((id): id is string => Boolean(id));
    if (!bondIds.length) return;
    await this.prisma.constructionBond.updateMany({
      where: { id: { in: bondIds }, status: 'OPEN' },
      data: { status: 'ACTIVE' },
    });
  }

  private async notifyResident(
    communityId: string,
    residentId: string,
    title: string,
    message: string,
    link: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        communityId,
        residentId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (user) {
      await this.notificationsService.dispatchMany(
        communityId,
        [user.id],
        NotificationType.PAYMENT,
        title,
        message,
        link,
      );
    }
  }

  private async nextAssessmentNumber(communityId: string): Promise<string> {
    const latest = await this.prisma.assessment.findFirst({
      where: { communityId },
      orderBy: { assessmentNumber: 'desc' },
      select: { assessmentNumber: true },
    });

    let nextNumber = 0;
    if (latest) {
      const parsed = parseInt(latest.assessmentNumber.replace(/^ASS-/, ''), 10);
      if (!Number.isNaN(parsed)) nextNumber = parsed;
    }
    nextNumber += 1;

    return `ASS-${String(nextNumber).padStart(6, '0')}`;
  }

  private async ensurePeriodAssessment(
    communityId: string,
    period: {
      id: string;
      label: string;
      periodKey: string;
      amount: number;
      dueDate: Date;
      chargeTypeId: string;
    },
    householdId: string,
  ) {
    const existing = await this.prisma.assessment.findFirst({
      where: {
        communityId,
        billingPeriodId: period.id,
        householdId,
        deletedAt: null,
      },
    });

    if (existing) {
      if (
        existing.status === AssessmentStatus.PAID ||
        existing.status === AssessmentStatus.WAIVED ||
        existing.status === AssessmentStatus.CANCELLED
      ) {
        throw new ConflictException(
          `Billing period ${period.label} is already ${existing.status
            .toLowerCase()
            .replace('_', ' ')} for this household.`,
        );
      }
      return existing;
    }

    return this.prisma.assessment.create({
      data: {
        communityId,
        assessmentNumber: await this.nextAssessmentNumber(communityId),
        title: period.label,
        description: `Billing period ${period.periodKey}`,
        householdId,
        chargeTypeId: period.chargeTypeId,
        billingPeriodId: period.id,
        amount: period.amount,
        dueDate: period.dueDate,
        period: period.periodKey,
        status: AssessmentStatus.ISSUED,
      },
    });
  }

  /**
   * Resolves the set of (assessmentId, amount) a payment should cover.
   * Supports:
   *  - explicit allocations [{ assessmentId, amount }]
   *  - a single legacy assessmentId (full amount)
   *  - billingPeriodIds for advance payments (creates the household's
   *    assessment for the period when one does not yet exist)
   */
  private async resolveTargets(
    communityId: string,
    dto: CreatePaymentDto,
    householdId: string,
  ): Promise<{
    targets: { assessmentId: string; amount: number }[];
    chargeTypeId?: string;
  }> {
    const targets: { assessmentId: string; amount: number }[] = [];

    const verifyOwnership = async (assessmentId: string) => {
      const assessment = await this.prisma.assessment.findFirst({
        where: { id: assessmentId, communityId, deletedAt: null },
      });

      if (!assessment) {
        throw new NotFoundException('Assessment not found.');
      }

      if (assessment.status === AssessmentStatus.CANCELLED) {
        throw new ConflictException(
          'Payment cannot be made on a cancelled assessment.',
        );
      }

      if (
        assessment.status === AssessmentStatus.PAID ||
        assessment.status === AssessmentStatus.WAIVED
      ) {
        throw new ConflictException(
          `Payment cannot be made on an already ${
            assessment.status === AssessmentStatus.PAID ? 'paid' : 'waived'
          } assessment.`,
        );
      }

      if (assessment.householdId !== householdId) {
        throw new BadRequestException(
          'Resident must belong to the assessment’s household.',
        );
      }

      return assessment;
    };

    if (dto.allocations?.length) {
      for (const allocation of dto.allocations) {
        await verifyOwnership(allocation.assessmentId);
        targets.push({
          assessmentId: allocation.assessmentId,
          amount: allocation.amount,
        });
      }
    } else if (dto.assessmentId) {
      const assessment = await verifyOwnership(dto.assessmentId);
      targets.push({
        assessmentId: dto.assessmentId,
        amount: Math.min(
          dto.amount,
          Math.max(
            assessment.amount.toNumber() -
              assessment.discountAmount.toNumber() -
              assessment.paidAmount.toNumber(),
            0,
          ),
        ),
      });
    }

    if (dto.billingPeriodIds?.length) {
      const periods = await this.prisma.billingPeriod.findMany({
        where: {
          id: { in: dto.billingPeriodIds },
          communityId,
          deletedAt: null,
          status: { in: ['OPEN', 'OVERDUE'] },
        },
        include: {
          chargeType: true,
        },
      });

      const foundIds = new Set(periods.map((period) => period.id));
      for (const periodId of dto.billingPeriodIds) {
        if (!foundIds.has(periodId)) {
          throw new NotFoundException('Billing period not found.');
        }
      }

      for (const period of periods) {
        const isRecurring =
          period.chargeType.recurrence === ChargeRecurrence.RECURRING;

        if (!isRecurring && !period.chargeType.advanceAppliesToOneTime) {
          throw new BadRequestException(
            `Advance payment is not allowed for ${period.chargeType.name}.`,
          );
        }

        if (!period.chargeType.allowAdvancePayment) {
          throw new BadRequestException(
            `Advance payment is not allowed for ${period.chargeType.name}.`,
          );
        }

        const assessment = await this.ensurePeriodAssessment(
          communityId,
          {
            id: period.id,
            label: period.label,
            periodKey: period.periodKey,
            amount: period.amount.toNumber(),
            dueDate: period.dueDate,
            chargeTypeId: period.chargeTypeId,
          },
          householdId,
        );

        targets.push({
          assessmentId: assessment.id,
          amount: Math.max(
            assessment.amount.toNumber() -
              assessment.discountAmount.toNumber() -
              assessment.paidAmount.toNumber(),
            0,
          ),
        });
      }
    }

    // Dedupe identical assessment targets and merge their amounts
    const merged = new Map<string, number>();
    for (const target of targets) {
      merged.set(
        target.assessmentId,
        (merged.get(target.assessmentId) ?? 0) + target.amount,
      );
    }
    const deduped = Array.from(merged.entries()).map(
      ([assessmentId, amount]) => ({ assessmentId, amount }),
    );

    // Derive a single charge type when every target shares the same one
    let chargeTypeId: string | undefined;
    if (deduped.length > 0) {
      const distinctChargeTypes = new Set<string>();
      for (const target of deduped) {
        const assessment = await this.prisma.assessment.findFirst({
          where: { id: target.assessmentId, communityId },
          select: { chargeTypeId: true },
        });
        if (assessment?.chargeTypeId) {
          distinctChargeTypes.add(assessment.chargeTypeId);
        }
      }
      if (distinctChargeTypes.size === 1) {
        chargeTypeId = Array.from(distinctChargeTypes)[0];
      }
    }

    return { targets: deduped, chargeTypeId };
  }

  private async replaceAllocations(
    communityId: string,
    paymentId: string,
    dto: CreatePaymentDto,
    householdId: string,
    amount: number,
  ) {
    await this.prisma.paymentAllocation.deleteMany({
      where: { communityId, paymentId },
    });

    const { targets, chargeTypeId } = await this.resolveTargets(
      communityId,
      dto,
      householdId,
    );

    const allocatedTotal = targets.reduce(
      (sum, target) => sum + target.amount,
      0,
    );
    if (Math.abs(allocatedTotal - amount) > 0.005) {
      throw new BadRequestException(
        `Payment amount must equal the sum of selected items (${allocatedTotal.toFixed(
          2,
        )}).`,
      );
    }

    if (targets.length > 0) {
      await this.prisma.paymentAllocation.createMany({
        data: targets.map((target) => ({
          communityId,
          paymentId,
          assessmentId: target.assessmentId,
          allocatedAmount: target.amount,
        })),
      });
    }

    if (chargeTypeId) {
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { chargeTypeId },
      });
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  ChargeRecurrence,
  NotificationType,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationsService } from '../notifications/notifications.service';

import { FinanceSyncService } from './finance-sync.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { RejectPaymentDto } from './dto/payment-review.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // Create Payment (always starts PENDING_VERIFICATION)
  // ==========================================

  async create(communityId: string, dto: CreatePaymentDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.paymentNumber = dto.paymentNumber.trim();
    dto.referenceNumber = dto.referenceNumber?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Duplicate Payment Number
    // ==========================================

    const existing = await this.prisma.payment.findFirst({
      where: {
        communityId,
        paymentNumber: dto.paymentNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Payment already exists.');
    }

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

    if (targets.length === 0) {
      throw new BadRequestException(
        'Select at least one assessment or billing period to pay for.',
      );
    }

    const allocatedTotal = targets.reduce(
      (sum, target) => sum + target.amount,
      0,
    );

    // Allow small rounding tolerance (e.g. 1200.0000001)
    if (Math.abs(allocatedTotal - dto.amount) > 0.005) {
      throw new BadRequestException(
        `Payment amount must equal the sum of selected items (${allocatedTotal.toFixed(
          2,
        )}).`,
      );
    }

    // ==========================================
    // Create Payment + Allocations
    // ==========================================

    const payment = await this.prisma.payment.create({
      data: {
        communityId,

        paymentNumber: dto.paymentNumber,
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

        allocations: {
          create: targets.map((target) => ({
            communityId,
            assessmentId: target.assessmentId,
            allocatedAmount: target.amount,
          })),
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

    // ==========================================
    // Notify Finance Staff
    // ==========================================

    const financeUserIds =
      await this.notificationsService.userIdsWithPermission(
        communityId,
        'finance.verify',
      );

    await this.notificationsService.notifyMany(
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
      message: 'Payment recorded and awaiting verification.',
      data: payment,
    };
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

    if (dto.paymentNumber) data.paymentNumber = dto.paymentNumber.trim();
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

    await this.prisma.payment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    const assessmentIds = await this.allocatedAssessmentIds(id);
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

    await this.syncLinkedAssessments(communityId, id);

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

    await this.syncLinkedAssessments(communityId, id);

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

    await this.syncLinkedAssessments(communityId, id);

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

    await this.syncLinkedAssessments(communityId, id);

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

  private async syncLinkedAssessments(communityId: string, paymentId: string) {
    const assessmentIds = await this.allocatedAssessmentIds(paymentId);
    for (const assessmentId of assessmentIds) {
      await this.financeSyncService.syncAssessment(communityId, assessmentId);
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
      await this.notificationsService.notifyMany(
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
      await verifyOwnership(dto.assessmentId);
      targets.push({
        assessmentId: dto.assessmentId,
        amount: dto.amount,
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
          amount: period.amount.toNumber(),
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

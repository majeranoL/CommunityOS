import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  BillingPeriodStatus,
  HouseholdStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';

import { FinanceSyncService } from './finance-sync.service';

import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentQueryDto } from './dto/assessment-query.dto';
import { GenerateAssessmentsDto } from './dto/generate-assessments.dto';
import { DuesTrackerQueryDto } from './dto/dues-tracker-query.dto';

import { buildDuesTracker } from './dues-tracker';

import {
  DEFAULT_BAD_STANDING_BALANCE_THRESHOLD,
  DEFAULT_DELINQUENCY_THRESHOLD_MONTHS,
  GOOD_BAD_STANDING_FEATURE,
} from '../features/feature.constants';

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
    private readonly featuresService: FeaturesService,
  ) {}

  // ==========================================
  // Create Assessment
  // ==========================================

  async create(communityId: string, dto: CreateAssessmentDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.assessmentNumber = dto.assessmentNumber.trim();
    dto.title = dto.title.trim();
    dto.description = dto.description?.trim();
    dto.period = dto.period?.trim();
    dto.remarks = dto.remarks?.trim();

    // ==========================================
    // Duplicate Assessment Number
    // ==========================================

    const existing = await this.prisma.assessment.findFirst({
      where: {
        communityId,
        assessmentNumber: dto.assessmentNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Assessment already exists.');
    }

    // ==========================================
    // Validate Household
    // ==========================================

    const household = await this.prisma.household.findFirst({
      where: {
        id: dto.householdId,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    // ==========================================
    // Validate linked charge type / billing period
    // ==========================================

    if (dto.billingPeriodId) {
      const period = await this.prisma.billingPeriod.findFirst({
        where: {
          id: dto.billingPeriodId,
          communityId,
          deletedAt: null,
        },
      });

      if (!period) {
        throw new NotFoundException('Billing period not found.');
      }
    }

    if (dto.chargeTypeId) {
      const chargeType = await this.prisma.chargeType.findFirst({
        where: {
          id: dto.chargeTypeId,
          communityId,
          deletedAt: null,
        },
      });

      if (!chargeType) {
        throw new NotFoundException('Charge type not found.');
      }
    }

    // ==========================================
    // Create Assessment
    // ==========================================

    const assessment = await this.prisma.assessment.create({
      data: {
        communityId,

        assessmentNumber: dto.assessmentNumber,
        title: dto.title,
        description: dto.description,
        householdId: dto.householdId,
        amount: dto.amount,
        dueDate: new Date(dto.dueDate),
        period: dto.period,
        remarks: dto.remarks,
        chargeTypeId: dto.chargeTypeId,
        billingPeriodId: dto.billingPeriodId,

        status: AssessmentStatus.DRAFT,
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
      },
    });

    if (assessment.billingPeriodId) {
      await this.financeSyncService.syncPeriod(
        communityId,
        assessment.billingPeriodId,
      );
    }

    return {
      success: true,
      message: 'Assessment created successfully.',
      data: assessment,
    };
  }

  // ==========================================
  // Generate Assessments (bulk monthly dues)
  // One assessment per ACTIVE household
  // ==========================================

  async generate(communityId: string, dto: GenerateAssessmentsDto) {
    const { dueDate, householdIds } = dto;

    // ==========================================
    // Resolve billing period + charge type
    // ==========================================

    const chargeTypeId: string | undefined = dto.chargeTypeId;
    let billingPeriodId: string | undefined = dto.billingPeriodId;

    if (chargeTypeId && !billingPeriodId) {
      const chargeType = await this.prisma.chargeType.findFirst({
        where: {
          id: chargeTypeId,
          communityId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!chargeType) {
        throw new NotFoundException('Charge type not found.');
      }

      const periodKey = this.resolvePeriodKey(dto.period, dueDate);
      billingPeriodId = await this.findOrCreateBillingPeriod(
        communityId,
        {
          id: chargeType.id,
          name: chargeType.name,
          dueDay: chargeType.dueDay,
        },
        periodKey,
        dto.amount,
        dueDate,
      );
    }

    const period = billingPeriodId
      ? await this.prisma.billingPeriod.findUnique({
          where: { id: billingPeriodId },
        })
      : null;

    const title = dto.title ?? period?.label ?? 'Monthly Dues';
    const amount =
      dto.amount ?? (period ? period.amount.toNumber() : undefined);

    if (title === undefined || amount === undefined) {
      throw new BadRequestException(
        'Provide a charge type, billing period, or explicit title and amount.',
      );
    }

    // ==========================================
    // Households to bill
    // ==========================================

    const where: any = {
      communityId,
      deletedAt: null,
      status: HouseholdStatus.ACTIVE,
    };

    if (householdIds?.length) {
      where.id = { in: householdIds };
    }

    const households = await this.prisma.household.findMany({
      where,
      select: { id: true },
    });

    if (households.length === 0) {
      throw new BadRequestException('No active households to bill.');
    }

    let eligibleIds = households.map((household) => household.id);
    let skippedCount = 0;

    // Dedupe: households that already carry a non-cancelled assessment
    // for this period are skipped so re-running doesn't double-bill
    const dedupePeriod = period?.periodKey ?? dto.period;
    if (dedupePeriod) {
      const existing = await this.prisma.assessment.findMany({
        where: {
          communityId,
          deletedAt: null,
          ...(billingPeriodId ? { billingPeriodId } : { period: dedupePeriod }),
          householdId: { in: eligibleIds },
          status: { not: AssessmentStatus.CANCELLED },
        },
        select: { householdId: true },
      });

      const claimed = new Set(
        existing.map((assessment) => assessment.householdId),
      );
      const before = eligibleIds.length;
      eligibleIds = eligibleIds.filter((id) => !claimed.has(id));
      skippedCount = before - eligibleIds.length;
    }

    if (eligibleIds.length === 0) {
      throw new ConflictException(
        'All selected households already have an assessment for this period.',
      );
    }

    // Next assessment numbers
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

    const due = new Date(dueDate);
    const created: Prisma.AssessmentGetPayload<{
      include: {
        household: {
          select: {
            id: true;
            block: true;
            lot: true;
            unit: true;
          };
        };
      };
    }>[] = [];

    for (const householdId of eligibleIds) {
      nextNumber += 1;

      const assessment = await this.prisma.assessment.create({
        data: {
          communityId,
          assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
          title: String(title).trim(),
          description: dto.description?.trim(),
          householdId,
          amount,
          dueDate: due,
          period: period?.periodKey ?? dto.period?.trim(),
          remarks: dto.remarks?.trim(),
          chargeTypeId: chargeTypeId ?? period?.chargeTypeId,
          billingPeriodId: billingPeriodId ?? period?.id,
          status: AssessmentStatus.ISSUED,
        },
        include: {
          household: {
            select: {
              id: true,
              block: true,
              lot: true,
              unit: true,
            },
          },
        },
      });

      created.push(assessment);
    }

    if (period?.id) {
      await this.financeSyncService.syncPeriod(communityId, period.id);
    }

    return {
      success: true,
      message: `Generated ${created.length} assessment${
        created.length === 1 ? '' : 's'
      }.`,
      data: {
        created,
        createdCount: created.length,
        skippedCount,
      },
    };
  }

  // ==========================================
  // Get All Assessments
  // ==========================================

  async findAll(
    communityId: string,
    query: AssessmentQueryDto,
    scopeHouseholdId?: string,
  ) {
    await this.financeSyncService.sweepOverdue(communityId);

    const {
      page,
      limit,
      search,
      status,
      householdId,
      chargeTypeId,
      billingPeriodId,
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
          assessmentNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          period: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (chargeTypeId) {
      where.chargeTypeId = chargeTypeId;
    }

    if (billingPeriodId) {
      where.billingPeriodId = billingPeriodId;
    }

    if (category) {
      where.OR = where.OR ?? [];
      where.OR.push({
        chargeType: {
          category,
        },
      });
    }

    // Household scoping: a forced scope (member sees only their own
    // household) overrides any client-supplied household filter
    if (scopeHouseholdId) {
      where.householdId = scopeHouseholdId;
    } else if (householdId) {
      where.householdId = householdId;
    }

    const [assessments, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          household: {
            select: {
              id: true,
              block: true,
              lot: true,
              unit: true,
            },
          },
          chargeType: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          billingPeriod: {
            select: {
              id: true,
              label: true,
              periodKey: true,
              status: true,
            },
          },
        },
      }),

      this.prisma.assessment.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Assessments retrieved successfully.',
      data: assessments,

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
  // Dues Tracker (household x period matrix)
  // ==========================================

  async duesTracker(
    communityId: string,
    dto: DuesTrackerQueryDto,
    scopeHouseholdId?: string,
  ) {
    await this.financeSyncService.sweepOverdue(communityId);

    const now = new Date();
    const fromMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (dto.months - 1),
      1,
    );
    const fromKey = `${fromMonth.getFullYear()}-${String(
      fromMonth.getMonth() + 1,
    ).padStart(2, '0')}`;

    const households = await this.prisma.household.findMany({
      where: {
        communityId,
        deletedAt: null,
        ...(scopeHouseholdId
          ? { id: scopeHouseholdId }
          : { status: HouseholdStatus.ACTIVE }),
      },
      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
      },
      orderBy: [{ block: 'asc' }, { lot: 'asc' }, { unit: 'asc' }],
    });

    const assessments = await this.prisma.assessment.findMany({
      where: {
        communityId,
        deletedAt: null,
        period: { gte: fromKey, not: null },
        ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
      },
      select: {
        id: true,
        householdId: true,
        amount: true,
        paidAmount: true,
        status: true,
        period: true,
        dueDate: true,
      },
    });

    const config = await this.featuresService.getConfig(
      communityId,
      GOOD_BAD_STANDING_FEATURE,
    );

    const delinquencyThresholdMonths =
      typeof config.delinquencyThresholdMonths === 'number' &&
      Number.isFinite(config.delinquencyThresholdMonths) &&
      config.delinquencyThresholdMonths > 0
        ? config.delinquencyThresholdMonths
        : DEFAULT_DELINQUENCY_THRESHOLD_MONTHS;

    const badStandingBalanceThreshold =
      typeof config.badStandingBalanceThreshold === 'number' &&
      Number.isFinite(config.badStandingBalanceThreshold) &&
      config.badStandingBalanceThreshold > 0
        ? config.badStandingBalanceThreshold
        : DEFAULT_BAD_STANDING_BALANCE_THRESHOLD;

    const tracker = buildDuesTracker(
      households,
      assessments.map((assessment) => ({
        ...assessment,
        amount: Number(assessment.amount),
        paidAmount: Number(assessment.paidAmount),
      })),
      now,
      delinquencyThresholdMonths,
      badStandingBalanceThreshold,
    );

    return {
      success: true,
      message: 'Dues tracker retrieved successfully.',
      data: tracker,
    };
  }

  // ==========================================
  // Get Assessment By ID
  // ==========================================

  async findOne(communityId: string, id: string, scopeHouseholdId?: string) {
    await this.financeSyncService.sweepOverdue(communityId);

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
        ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
        chargeType: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        billingPeriod: {
          select: {
            id: true,
            label: true,
            periodKey: true,
            dueDate: true,
            status: true,
          },
        },
        allocations: {
          include: {
            payment: {
              select: {
                id: true,
                paymentNumber: true,
                amount: true,
                paymentDate: true,
                method: true,
                status: true,
                verifiedAt: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            method: true,
            status: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    return {
      success: true,
      message: 'Assessment retrieved successfully.',
      data: assessment,
    };
  }

  // ==========================================
  // Update Assessment
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateAssessmentDto) {
    const assessment = await this.findScoped(communityId, id);

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.assessmentNumber)
      dto.assessmentNumber = dto.assessmentNumber.trim();

    if (dto.title) dto.title = dto.title.trim();

    if (dto.description) dto.description = dto.description.trim();

    if (dto.period) dto.period = dto.period.trim();

    if (dto.remarks) dto.remarks = dto.remarks.trim();

    // ==========================================
    // Duplicate Assessment Number
    // ==========================================

    if (dto.assessmentNumber) {
      const existing = await this.prisma.assessment.findFirst({
        where: {
          communityId,
          assessmentNumber: dto.assessmentNumber,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Assessment already exists.');
      }
    }

    // ==========================================
    // Validate Household
    // ==========================================

    if (dto.householdId) {
      const household = await this.prisma.household.findFirst({
        where: {
          id: dto.householdId,
          communityId,
          deletedAt: null,
        },
      });

      if (!household) {
        throw new NotFoundException('Household not found.');
      }
    }

    // ==========================================
    // Validate linked billing period / charge type
    // ==========================================

    if (dto.billingPeriodId) {
      const period = await this.prisma.billingPeriod.findFirst({
        where: {
          id: dto.billingPeriodId,
          communityId,
          deletedAt: null,
        },
      });

      if (!period) {
        throw new NotFoundException('Billing period not found.');
      }
    }

    if (dto.chargeTypeId) {
      const chargeType = await this.prisma.chargeType.findFirst({
        where: {
          id: dto.chargeTypeId,
          communityId,
          deletedAt: null,
        },
      });

      if (!chargeType) {
        throw new NotFoundException('Charge type not found.');
      }
    }

    // ==========================================
    // Update Assessment
    // ==========================================

    const updatedAssessment = await this.prisma.assessment.update({
      where: {
        id,
      },

      data: {
        ...(dto.assessmentNumber && {
          assessmentNumber: dto.assessmentNumber,
        }),

        ...(dto.title && { title: dto.title }),

        ...(dto.description !== undefined && {
          description: dto.description,
        }),

        ...(dto.householdId && {
          householdId: dto.householdId,
        }),

        ...(dto.amount !== undefined && {
          amount: dto.amount,
        }),

        ...(dto.dueDate && {
          dueDate: new Date(dto.dueDate),
        }),

        ...(dto.period !== undefined && {
          period: dto.period,
        }),

        ...(dto.remarks !== undefined && {
          remarks: dto.remarks,
        }),

        ...(dto.chargeTypeId !== undefined && {
          chargeTypeId: dto.chargeTypeId,
        }),

        ...(dto.billingPeriodId !== undefined && {
          billingPeriodId: dto.billingPeriodId,
        }),
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
      },
    });

    // ==========================================
    // Recompute paidAmount / status when the
    // amount changes (stored paidAmount would drift)
    // ==========================================

    if (dto.amount !== undefined) {
      await this.financeSyncService.syncAssessment(communityId, id);
    }

    const linkedPeriodId =
      updatedAssessment.billingPeriodId ?? assessment.billingPeriodId;
    if (linkedPeriodId) {
      await this.financeSyncService.syncPeriod(communityId, linkedPeriodId);
    }

    return {
      success: true,
      message: 'Assessment updated successfully.',
      data: updatedAssessment,
    };
  }

  // ==========================================
  // Delete Assessment (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const assessment = await this.findScoped(communityId, id);

    await this.prisma.assessment.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
      },
    });

    if (assessment.billingPeriodId) {
      await this.financeSyncService.syncPeriod(
        communityId,
        assessment.billingPeriodId,
      );
    }

    return {
      success: true,
      message: 'Assessment deleted successfully.',
    };
  }

  // ==========================================
  // Issue Assessment
  // ==========================================

  async issue(communityId: string, id: string) {
    const assessment = await this.findScoped(communityId, id);

    if (
      assessment.status !== AssessmentStatus.DRAFT &&
      assessment.status !== AssessmentStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Only DRAFT or CANCELLED assessments can be issued.',
      );
    }

    return this.updateStatus(communityId, id, AssessmentStatus.ISSUED);
  }

  // ==========================================
  // Cancel Assessment
  // ==========================================

  async cancel(communityId: string, id: string) {
    const assessment = await this.findScoped(communityId, id);

    if (
      assessment.status === AssessmentStatus.PAID ||
      assessment.status === AssessmentStatus.CANCELLED
    ) {
      throw new ConflictException('Assessment cannot be cancelled.');
    }

    const result = await this.updateStatus(
      communityId,
      id,
      AssessmentStatus.CANCELLED,
    );

    if (assessment.billingPeriodId) {
      await this.financeSyncService.syncPeriod(
        communityId,
        assessment.billingPeriodId,
      );
    }

    return result;
  }

  // ==========================================
  // Waive Assessment
  // ==========================================

  async waive(communityId: string, id: string) {
    const assessment = await this.findScoped(communityId, id);

    if (
      assessment.status === AssessmentStatus.PAID ||
      assessment.status === AssessmentStatus.CANCELLED ||
      assessment.status === AssessmentStatus.WAIVED ||
      assessment.status === AssessmentStatus.DRAFT
    ) {
      throw new ConflictException('Assessment cannot be waived.');
    }

    const result = await this.updateStatus(
      communityId,
      id,
      AssessmentStatus.WAIVED,
    );

    if (assessment.billingPeriodId) {
      await this.financeSyncService.syncPeriod(
        communityId,
        assessment.billingPeriodId,
      );
    }

    return result;
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    return assessment;
  }

  private resolvePeriodKey(period?: string, dueDate?: string): string {
    if (period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return period;
    }

    const due = dueDate ? new Date(dueDate) : new Date();
    return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}`;
  }

  private async findOrCreateBillingPeriod(
    communityId: string,
    chargeType: {
      id: string;
      name: string;
      dueDay: number | null;
    },
    periodKey: string,
    amount?: number,
    dueDate?: string,
  ): Promise<string> {
    const existing = await this.prisma.billingPeriod.findFirst({
      where: {
        communityId,
        chargeTypeId: chargeType.id,
        periodKey,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) {
      return existing.id;
    }

    let due: Date;
    if (dueDate) {
      due = new Date(dueDate);
    } else {
      const base = new Date(`${periodKey}-01T00:00:00`);
      const day = chargeType.dueDay ?? base.getDate();
      const lastDay = new Date(
        base.getFullYear(),
        base.getMonth() + 1,
        0,
      ).getDate();
      due = new Date(
        base.getFullYear(),
        base.getMonth(),
        Math.min(day, lastDay),
      );
    }

    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));

    const created = await this.prisma.billingPeriod.create({
      data: {
        communityId,
        chargeTypeId: chargeType.id,
        periodKey,
        label: `${chargeType.name} - ${periodKey}`,
        startDate: new Date(year, month - 1, 1),
        amount: amount ?? 0,
        dueDate: due,
        status: BillingPeriodStatus.OPEN,
      },
      select: { id: true },
    });

    return created.id;
  }

  private async updateStatus(
    communityId: string,
    id: string,
    status: AssessmentStatus,
  ) {
    const assessment = await this.prisma.assessment.update({
      where: {
        id,
      },

      data: {
        status,
      },

      include: {
        household: {
          select: {
            id: true,
            block: true,
            lot: true,
            unit: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Assessment ${status.toLowerCase().replace('_', ' ')} successfully.`,
      data: assessment,
    };
  }
}

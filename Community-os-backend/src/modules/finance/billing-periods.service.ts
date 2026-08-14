import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BillingPeriodStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceSyncService } from './finance-sync.service';

import {
  BillingPeriodQueryDto,
  CreateBillingPeriodDto,
  GenerateBillingPeriodsDto,
} from './dto/billing-period.dto';

@Injectable()
export class BillingPeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // Create Billing Period
  // ==========================================

  async create(communityId: string, dto: CreateBillingPeriodDto) {
    const chargeType = await this.prisma.chargeType.findFirst({
      where: { id: dto.chargeTypeId, communityId, deletedAt: null },
    });

    if (!chargeType) {
      throw new NotFoundException('Charge type not found.');
    }

    const existing = await this.prisma.billingPeriod.findFirst({
      where: {
        communityId,
        chargeTypeId: dto.chargeTypeId,
        periodKey: dto.periodKey,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A billing period for this charge type and period already exists.',
      );
    }

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : this.defaultDueDate(dto.periodKey, chargeType.dueDay);

    const label = dto.label?.trim() ?? `${chargeType.name} - ${dto.periodKey}`;

    const period = await this.prisma.billingPeriod.create({
      data: {
        communityId,
        chargeTypeId: dto.chargeTypeId,
        periodKey: dto.periodKey,
        label,
        startDate: dto.startDate
          ? new Date(dto.startDate)
          : this.periodStart(dto.periodKey),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        dueDate,
        amount: dto.amount ?? chargeType.amount?.toNumber() ?? 0,
        status: BillingPeriodStatus.OPEN,
      },
      include: {
        chargeType: {
          select: { id: true, name: true, category: true, code: true },
        },
      },
    });

    return {
      success: true,
      message: 'Billing period created successfully.',
      data: period,
    };
  }

  // ==========================================
  // Generate Billing Periods (bulk, future months)
  // ==========================================

  async generate(communityId: string, dto: GenerateBillingPeriodsDto) {
    const chargeType = await this.prisma.chargeType.findFirst({
      where: { id: dto.chargeTypeId, communityId, deletedAt: null },
    });

    if (!chargeType) {
      throw new NotFoundException('Charge type not found.');
    }

    const months = dto.months ?? 1;
    const [year, month] = dto.periodKey
      .split('-')
      .map((part) => parseInt(part, 10));

    const created: any[] = [];

    for (let offset = 0; offset < months; offset += 1) {
      const target = new Date(year, month - 1 + offset, 1);
      const periodKey = `${target.getFullYear()}-${String(
        target.getMonth() + 1,
      ).padStart(2, '0')}`;

      const existing = await this.prisma.billingPeriod.findFirst({
        where: {
          communityId,
          chargeTypeId: dto.chargeTypeId,
          periodKey,
          deletedAt: null,
        },
      });

      if (existing) {
        continue;
      }

      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : this.defaultDueDate(periodKey, chargeType.dueDay);

      const period = await this.prisma.billingPeriod.create({
        data: {
          communityId,
          chargeTypeId: dto.chargeTypeId,
          periodKey,
          label: `${chargeType.name} - ${periodKey}`,
          startDate: this.periodStart(periodKey),
          dueDate,
          amount: dto.amount ?? chargeType.amount?.toNumber() ?? 0,
          status: BillingPeriodStatus.OPEN,
        },
      });

      created.push(period);
    }

    return {
      success: true,
      message: `Generated ${created.length} billing period${
        created.length === 1 ? '' : 's'
      }.`,
      data: {
        created,
        createdCount: created.length,
      },
    };
  }

  // ==========================================
  // Get All Billing Periods
  // ==========================================

  async findAll(communityId: string, query: BillingPeriodQueryDto) {
    await this.financeSyncService.sweepOverdue(communityId);

    const { page, limit, chargeTypeId, periodKey, status, sortBy, order } =
      query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (chargeTypeId) {
      where.chargeTypeId = chargeTypeId;
    }

    if (periodKey) {
      where.periodKey = periodKey;
    }

    if (status) {
      where.status = status;
    }

    const [periods, total] = await this.prisma.$transaction([
      this.prisma.billingPeriod.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ [sortBy]: order }],
        include: {
          chargeType: {
            select: { id: true, name: true, category: true, code: true },
          },
          _count: {
            select: {
              assessments: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.billingPeriod.count({ where }),
    ]);

    return {
      success: true,
      message: 'Billing periods retrieved successfully.',
      data: periods,
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
  // Get Billing Period By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    await this.financeSyncService.sweepOverdue(communityId);

    const period = await this.prisma.billingPeriod.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        chargeType: {
          select: { id: true, name: true, category: true, code: true },
        },
        assessments: {
          where: { deletedAt: null },
          include: {
            household: {
              select: { id: true, block: true, lot: true, unit: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Billing period not found.');
    }

    return {
      success: true,
      message: 'Billing period retrieved successfully.',
      data: period,
    };
  }

  // ==========================================
  // Update Billing Period
  // ==========================================

  async update(
    communityId: string,
    id: string,
    dto: Partial<CreateBillingPeriodDto> & { status?: BillingPeriodStatus },
  ) {
    const period = await this.findScoped(communityId, id);

    if (dto.periodKey && dto.periodKey !== period.periodKey) {
      const duplicate = await this.prisma.billingPeriod.findFirst({
        where: {
          communityId,
          chargeTypeId: period.chargeTypeId,
          periodKey: dto.periodKey,
          deletedAt: null,
          NOT: { id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'A billing period for this charge type and period already exists.',
        );
      }
    }

    const updated = await this.prisma.billingPeriod.update({
      where: { id },
      data: {
        ...(dto.chargeTypeId && { chargeTypeId: dto.chargeTypeId }),
        ...(dto.periodKey && { periodKey: dto.periodKey }),
        ...(dto.label !== undefined && { label: dto.label?.trim() }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        chargeType: {
          select: { id: true, name: true, category: true, code: true },
        },
      },
    });

    await this.financeSyncService.syncPeriod(communityId, id);

    return {
      success: true,
      message: 'Billing period updated successfully.',
      data: updated,
    };
  }

  // ==========================================
  // Delete Billing Period (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    const linkedAssessments = await this.prisma.assessment.count({
      where: {
        communityId,
        billingPeriodId: id,
        deletedAt: null,
      },
    });

    if (linkedAssessments > 0) {
      throw new BadRequestException(
        'Cannot delete a billing period that already has assessments.',
      );
    }

    await this.prisma.billingPeriod.update({
      where: { id },
      data: { deletedAt: new Date(), status: BillingPeriodStatus.CANCELLED },
    });

    return {
      success: true,
      message: 'Billing period deleted successfully.',
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const period = await this.prisma.billingPeriod.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!period) {
      throw new NotFoundException('Billing period not found.');
    }

    return period;
  }

  private defaultDueDate(periodKey: string, dueDay: number | null): Date {
    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));
    const day = dueDay ?? 1;
    const lastDay = new Date(year, month, 0).getDate();
    return new Date(year, month - 1, Math.min(day, lastDay));
  }

  private periodStart(periodKey: string): Date {
    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));
    return new Date(year, month - 1, 1);
  }
}

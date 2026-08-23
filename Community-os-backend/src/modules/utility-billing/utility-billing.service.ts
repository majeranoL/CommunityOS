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
  UtilityRateMode,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceSyncService } from '../finance/finance-sync.service';

import {
  CreateUtilityConfigDto,
  CreateUtilityReadingDto,
  GenerateUtilityBillsDto,
  TieredRateDto,
  UpdateUtilityConfigDto,
  UpdateUtilityReadingDto,
  UtilityConfigQueryDto,
  UtilityReadingQueryDto,
} from './dto/utility-billing.dto';

@Injectable()
export class UtilityBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // Utility configs (Water, Electricity, ...)
  // ==========================================

  async createConfig(communityId: string, dto: CreateUtilityConfigDto) {
    dto.name = dto.name.trim();

    const existing = await this.prisma.utilityConfig.findFirst({
      where: {
        communityId,
        utilityType: dto.utilityType,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A configuration for this utility type already exists.',
      );
    }

    this.validateRates(dto.rateMode, dto.unitRate, dto.fixedRate);

    const chargeType = await this.ensureChargeType(
      communityId,
      dto.utilityType,
      dto.name,
    );

    const config = await this.prisma.utilityConfig.create({
      data: {
        communityId,
        utilityType: dto.utilityType,
        name: dto.name,
        rateMode: dto.rateMode,
        unitRate:
          dto.rateMode === UtilityRateMode.METERED ? dto.unitRate : null,
        fixedRate:
          dto.rateMode === UtilityRateMode.FIXED ? dto.fixedRate : null,
        tieredRates:
          dto.rateMode === UtilityRateMode.METERED && dto.tieredRates?.length
            ? (dto.tieredRates as any)
            : undefined,
        chargeTypeId: chargeType.id,
        isActive: dto.isActive ?? true,
      },
      include: { chargeType: { select: { id: true, name: true } } },
    });

    return {
      success: true,
      message: 'Utility configuration created successfully.',
      data: config,
    };
  }

  async findConfigs(communityId: string, query: UtilityConfigQueryDto) {
    const configs = await this.prisma.utilityConfig.findMany({
      where: {
        communityId,
        deletedAt: null,
        ...(query.utilityType ? { utilityType: query.utilityType } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      },
      include: {
        chargeType: { select: { id: true, name: true, category: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return {
      success: true,
      message: 'Utility configurations retrieved successfully.',
      data: configs,
    };
  }

  async updateConfig(
    communityId: string,
    id: string,
    dto: UpdateUtilityConfigDto,
  ) {
    const config = await this.findScopedConfig(communityId, id);

    if (dto.rateMode) {
      this.validateRates(dto.rateMode, dto.unitRate, dto.fixedRate);
    }

    const nextMode = dto.rateMode ?? config.rateMode;
    const unitRate =
      dto.unitRate !== undefined
        ? dto.unitRate
        : nextMode === UtilityRateMode.METERED
          ? config.unitRate?.toNumber()
          : undefined;
    const fixedRate =
      dto.fixedRate !== undefined
        ? dto.fixedRate
        : nextMode === UtilityRateMode.FIXED
          ? config.fixedRate?.toNumber()
          : undefined;

    const updated = await this.prisma.utilityConfig.update({
      where: { id: config.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.rateMode !== undefined && { rateMode: dto.rateMode }),
        ...(nextMode === UtilityRateMode.METERED
          ? {
              unitRate: unitRate ?? null,
              fixedRate: null,
              tieredRates: dto.tieredRates?.length
                ? (dto.tieredRates as any)
                : Prisma.DbNull,
            }
          : {
              unitRate: null,
              fixedRate: fixedRate ?? null,
              tieredRates: Prisma.DbNull,
            }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { chargeType: { select: { id: true, name: true } } },
    });

    return {
      success: true,
      message: 'Utility configuration updated successfully.',
      data: updated,
    };
  }

  async removeConfig(communityId: string, id: string) {
    const config = await this.findScopedConfig(communityId, id);

    await this.prisma.utilityConfig.update({
      where: { id: config.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return {
      success: true,
      message: 'Utility configuration removed successfully.',
    };
  }

  // ==========================================
  // Meter readings
  // ==========================================

  async createReading(
    communityId: string,
    userId: string,
    dto: CreateUtilityReadingDto,
  ) {
    const periodKey = dto.periodKey.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) {
      throw new BadRequestException('periodKey must be in YYYY-MM format.');
    }

    const config = await this.findScopedConfig(
      communityId,
      dto.utilityConfigId,
    );
    if (!config.isActive) {
      throw new BadRequestException('This utility configuration is inactive.');
    }

    const household = await this.prisma.household.findFirst({
      where: { id: dto.householdId, communityId, deletedAt: null },
    });
    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    const duplicate = await this.prisma.utilityReading.findUnique({
      where: {
        utilityConfigId_householdId_periodKey: {
          utilityConfigId: config.id,
          householdId: dto.householdId,
          periodKey,
        },
      },
    });
    if (duplicate) {
      throw new ConflictException(
        'A reading already exists for this household and period.',
      );
    }

    const previous =
      dto.previousReading ??
      (await this.latestReadingBefore(config.id, dto.householdId, periodKey));

    const usage = this.computeUsage(previous, dto.currentReading);

    const reading = await this.prisma.utilityReading.create({
      data: {
        communityId,
        utilityConfigId: config.id,
        householdId: dto.householdId,
        periodKey,
        previousReading: previous ?? null,
        currentReading: dto.currentReading ?? null,
        usage: usage ?? null,
        readingDate: dto.readingDate ? new Date(dto.readingDate) : new Date(),
        recordedById: userId,
        notes: dto.notes?.trim(),
      },
      include: {
        household: { select: { block: true, lot: true, unit: true } },
        utilityConfig: { select: { name: true, utilityType: true } },
      },
    });

    return {
      success: true,
      message: 'Utility reading recorded successfully.',
      data: reading,
    };
  }

  async findReadings(
    communityId: string,
    query: UtilityReadingQueryDto,
    scopeHouseholdId?: string,
  ) {
    const page = 1;
    const limit = 500;

    const readings = await this.prisma.utilityReading.findMany({
      where: {
        communityId,
        ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
        ...(query.householdId && !scopeHouseholdId
          ? { householdId: query.householdId }
          : {}),
        ...(query.utilityConfigId
          ? { utilityConfigId: query.utilityConfigId }
          : {}),
        ...(query.periodKey ? { periodKey: query.periodKey } : {}),
      },
      include: {
        household: { select: { id: true, block: true, lot: true, unit: true } },
        utilityConfig: { select: { name: true, utilityType: true } },
      },
      orderBy: [{ periodKey: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      message: 'Utility readings retrieved successfully.',
      data: readings,
    };
  }

  async updateReading(
    communityId: string,
    id: string,
    dto: UpdateUtilityReadingDto,
  ) {
    const reading = await this.prisma.utilityReading.findFirst({
      where: { id, communityId },
    });
    if (!reading) {
      throw new NotFoundException('Utility reading not found.');
    }

    const previous =
      dto.previousReading !== undefined
        ? dto.previousReading
        : reading.previousReading?.toNumber();
    const current =
      dto.currentReading !== undefined
        ? dto.currentReading
        : reading.currentReading?.toNumber();

    const updated = await this.prisma.utilityReading.update({
      where: { id: reading.id },
      data: {
        previousReading: previous ?? null,
        currentReading: current ?? null,
        usage: this.computeUsage(previous, current) ?? null,
        ...(dto.readingDate && { readingDate: new Date(dto.readingDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() }),
      },
    });

    return {
      success: true,
      message: 'Utility reading updated successfully.',
      data: updated,
    };
  }

  async removeReading(communityId: string, id: string) {
    const reading = await this.prisma.utilityReading.findFirst({
      where: { id, communityId },
    });
    if (!reading) {
      throw new NotFoundException('Utility reading not found.');
    }

    await this.prisma.utilityReading.delete({ where: { id: reading.id } });

    return {
      success: true,
      message: 'Utility reading removed successfully.',
    };
  }

  // ==========================================
  // Bill generation: turn readings / fixed
  // rates into per-household assessments.
  // ==========================================

  async generateBills(communityId: string, dto: GenerateUtilityBillsDto) {
    const now = new Date();
    const periodKey =
      dto.periodKey?.trim() ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) {
      throw new BadRequestException('periodKey must be in YYYY-MM format.');
    }

    const configs = await this.prisma.utilityConfig.findMany({
      where: { communityId, deletedAt: null, isActive: true },
    });

    if (configs.length === 0) {
      throw new NotFoundException(
        'No active utility configurations found. Configure utilities first.',
      );
    }

    const households = await this.prisma.household.findMany({
      where: { communityId, deletedAt: null, status: HouseholdStatus.ACTIVE },
      select: { id: true },
    });

    let billedCount = 0;
    let skippedExisting = 0;
    let skippedNoReading = 0;
    const perConfig: Record<string, number> = {};

    for (const config of configs) {
      const billingPeriodId = await this.ensurePeriod(
        communityId,
        config.chargeTypeId,
        config.name,
        periodKey,
      );

      const existingAssessments = await this.prisma.assessment.findMany({
        where: { communityId, billingPeriodId, deletedAt: null },
        select: { householdId: true },
      });
      const alreadyBilled = new Set(
        existingAssessments.map((assessment) => assessment.householdId),
      );

      let nextNumber = await this.nextAssessmentNumber(communityId);
      let configBilled = 0;

      if (config.rateMode === UtilityRateMode.METERED) {
        const readings = await this.prisma.utilityReading.findMany({
          where: { communityId, utilityConfigId: config.id, periodKey },
        });

        const tiers = Array.isArray(config.tieredRates)
          ? (config.tieredRates as unknown as TieredRateDto[])
          : [];

        for (const household of households) {
          if (alreadyBilled.has(household.id)) {
            skippedExisting += 1;
            continue;
          }

          const reading = readings.find(
            (entry) => entry.householdId === household.id,
          );
          const usage = reading?.usage?.toNumber();
          if (usage === undefined || usage === null) {
            skippedNoReading += 1;
            continue;
          }

          const amount = this.computeAmount(usage, config, tiers);

          nextNumber += 1;
          await this.prisma.assessment.create({
            data: {
              communityId,
              assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
              title: `${config.name} — ${periodKey}`,
              description: reading
                ? `Usage ${usage} based on meter reading (${
                    reading.previousReading?.toNumber() ?? '-'
                  } -> ${reading.currentReading?.toNumber() ?? '-'}).`
                : undefined,
              householdId: household.id,
              amount,
              dueDate: this.dueDateFor(periodKey),
              period: periodKey,
              chargeTypeId: config.chargeTypeId,
              billingPeriodId,
              status: AssessmentStatus.ISSUED,
            },
          });
          billedCount += 1;
          configBilled += 1;
        }
      } else {
        const amount = config.fixedRate?.toNumber() ?? 0;

        for (const household of households) {
          if (alreadyBilled.has(household.id)) {
            skippedExisting += 1;
            continue;
          }

          nextNumber += 1;
          await this.prisma.assessment.create({
            data: {
              communityId,
              assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
              title: `${config.name} — ${periodKey}`,
              householdId: household.id,
              amount,
              dueDate: this.dueDateFor(periodKey),
              period: periodKey,
              chargeTypeId: config.chargeTypeId,
              billingPeriodId,
              status: AssessmentStatus.ISSUED,
            },
          });
          billedCount += 1;
          configBilled += 1;
        }
      }

      perConfig[config.name] = configBilled;
      await this.financeSyncService.syncPeriod(communityId, billingPeriodId);
    }

    return {
      success: true,
      message: `Generated ${billedCount} utility assessment(s) for ${periodKey}.`,
      data: {
        periodKey,
        billedCount,
        skippedExisting,
        skippedNoReading,
        perConfig,
      },
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private validateRates(
    rateMode: UtilityRateMode,
    unitRate?: number,
    fixedRate?: number,
  ) {
    if (rateMode === UtilityRateMode.METERED && unitRate === undefined) {
      throw new BadRequestException(
        'Metered utilities require a unit rate (or tiered rates).',
      );
    }
    if (rateMode === UtilityRateMode.FIXED && fixedRate === undefined) {
      throw new BadRequestException(
        'Fixed-rate utilities require a fixed rate.',
      );
    }
  }

  private async ensureChargeType(
    communityId: string,
    utilityType: string,
    name: string,
  ) {
    const code = `UTILITY_${utilityType}`;

    const existing = await this.prisma.chargeType.findFirst({
      where: { communityId, code, deletedAt: null },
    });
    if (existing) return existing;

    return this.prisma.chargeType.create({
      data: {
        communityId,
        code,
        name,
        category: 'UTILITY',
        recurrence: 'RECURRING',
        description: `Auto-created for the ${name} utility.`,
        allowAdvancePayment: false,
      },
    });
  }

  private async findScopedConfig(communityId: string, id: string) {
    const config = await this.prisma.utilityConfig.findFirst({
      where: { id, communityId, deletedAt: null },
    });
    if (!config) {
      throw new NotFoundException('Utility configuration not found.');
    }
    return config;
  }

  private async latestReadingBefore(
    configId: string,
    householdId: string,
    periodKey: string,
  ): Promise<number | undefined> {
    const latest = await this.prisma.utilityReading.findFirst({
      where: {
        utilityConfigId: configId,
        householdId,
        periodKey: { lt: periodKey },
        currentReading: { not: null },
      },
      orderBy: { periodKey: 'desc' },
      select: { currentReading: true },
    });

    return latest?.currentReading?.toNumber();
  }

  private computeUsage(previous?: number, current?: number): number | null {
    if (previous === undefined || previous === null) return null;
    if (current === undefined || current === null) return null;
    const usage = Math.round((current - previous) * 100) / 100;
    return usage >= 0 ? usage : null;
  }

  private computeAmount(
    usage: number,
    config: { unitRate: any },
    tiers: TieredRateDto[],
  ): number {
    if (tiers.length > 0) {
      return Math.round(this.computeTiered(usage, tiers) * 100) / 100;
    }
    const rate = config.unitRate?.toNumber() ?? 0;
    return Math.round(usage * rate * 100) / 100;
  }

  private computeTiered(usage: number, tiers: TieredRateDto[]): number {
    const sorted = [...tiers].sort((a, b) => {
      if (a.upTo === null || a.upTo === undefined) return 1;
      if (b.upTo === null || b.upTo === undefined) return -1;
      return a.upTo - b.upTo;
    });

    let remaining = usage;
    let previousCap = 0;
    let total = 0;

    for (const tier of sorted) {
      if (remaining <= 0) break;

      const cap =
        tier.upTo === null || tier.upTo === undefined ? Infinity : tier.upTo;
      const span = cap - previousCap;
      const consumed = Math.min(remaining, span);

      total += consumed * tier.rate;
      remaining -= consumed;
      previousCap = cap;
    }

    return total;
  }

  private dueDateFor(periodKey: string): Date {
    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));
    return new Date(year, month - 1 + 1, 0);
  }

  private async ensurePeriod(
    communityId: string,
    chargeTypeId: string,
    name: string,
    periodKey: string,
  ): Promise<string> {
    const existing = await this.prisma.billingPeriod.findFirst({
      where: {
        communityId,
        chargeTypeId,
        periodKey,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existing) return existing.id;

    const created = await this.prisma.billingPeriod.create({
      data: {
        communityId,
        chargeTypeId,
        periodKey,
        label: `${name} — ${periodKey}`,
        startDate: this.periodStart(periodKey),
        dueDate: this.dueDateFor(periodKey),
        amount: 0,
        status: BillingPeriodStatus.OPEN,
      },
      select: { id: true },
    });

    return created.id;
  }

  private periodStart(periodKey: string): Date {
    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));
    return new Date(year, month - 1, 1);
  }

  private async nextAssessmentNumber(communityId: string): Promise<number> {
    const latest = await this.prisma.assessment.findFirst({
      where: { communityId },
      orderBy: { assessmentNumber: 'desc' },
      select: { assessmentNumber: true },
    });

    if (!latest) return 0;

    const parsed = parseInt(latest.assessmentNumber.replace(/^ASS-/, ''), 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

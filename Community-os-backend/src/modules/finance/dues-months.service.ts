import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  BillingPeriodStatus,
  ChargeRecurrence,
  FinanceCategory,
  HouseholdStatus,
  PaymentStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceSyncService } from './finance-sync.service';

import { CreateDuesMonthDto } from './dto/dues-month.dto';
import {
  buildDuesMonthSummaries,
  isValidPeriodKey,
  summarizeMonthRows,
} from './dues-months-tracker';

const DEFAULT_DUES_NAME = 'Monthly Dues';

@Injectable()
export class DuesMonthsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // Create (or fill) a dues month
  // ==========================================

  async createMonth(communityId: string, dto: CreateDuesMonthDto) {
    const periodKey = dto.month;

    if (!isValidPeriodKey(periodKey)) {
      throw new BadRequestException(
        'month must be in YYYY-MM format (e.g. 2026-08).',
      );
    }

    const chargeType = await this.ensureDuesChargeType(communityId);

    const amount = dto.amount ?? chargeType.amount?.toNumber() ?? 0;

    if (!amount || amount <= 0) {
      throw new BadRequestException(
        'Set an amount for the month or configure one in monthly dues settings first.',
      );
    }

    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : this.dueDateFor(chargeType.dueDay, periodKey);

    const result = await this.generateForPeriod({
      communityId,
      chargeTypeId: chargeType.id,
      chargeTypeName: chargeType.name,
      periodKey,
      amount,
      dueDate,
    });

    return {
      success: true,
      message:
        result.data.createdCount > 0
          ? `Assigned to ${result.data.createdCount} household${
              result.data.createdCount === 1 ? '' : 's'
            }.`
          : 'All households already have dues for this month.',
      data: result.data,
    };
  }

  // ==========================================
  // List dues months
  // ==========================================

  async listMonths(communityId: string) {
    await this.financeSyncService.sweepOverdue(communityId);

    const rows = await this.fetchDuesRows(communityId);
    const months = buildDuesMonthSummaries(rows);

    return { success: true, data: months };
  }

  // ==========================================
  // Single month breakdown per household
  // ==========================================

  async getMonth(communityId: string, periodKey: string) {
    if (!isValidPeriodKey(periodKey)) {
      throw new BadRequestException(
        'month must be in YYYY-MM format (e.g. 2026-08).',
      );
    }

    await this.financeSyncService.sweepOverdue(communityId);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: { not: AssessmentStatus.CANCELLED },
        chargeType: { category: FinanceCategory.DUES },
        OR: [{ period: periodKey }, { billingPeriod: { is: { periodKey } } }],
      },
      select: {
        id: true,
        status: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        period: true,
        billingPeriod: { select: { periodKey: true } },
        household: {
          select: { id: true, block: true, lot: true, unit: true },
        },
        payments: {
          where: { status: PaymentStatus.VERIFIED },
          orderBy: { paymentDate: 'desc' },
          take: 1,
          select: { paymentDate: true },
        },
      },
    });

    const { summary, households } = {
      summary: summarizeMonthRows(
        periodKey,
        assessments.map((assessment) => ({
          period: assessment.period,
          billingPeriodKey: assessment.billingPeriod?.periodKey ?? null,
          amount: assessment.amount.toNumber(),
          paidAmount: assessment.paidAmount.toNumber(),
          status: assessment.status,
          dueDate: assessment.dueDate,
        })),
      ),
      households: [] as Array<{
        assessmentId: string;
        householdId: string;
        block: string | null;
        lot: string | null;
        unit: string | null;
        amountDue: number;
        paidAmount: number;
        status: AssessmentStatus;
        lastPaymentDate: string | null;
      }>,
    };

    for (const assessment of assessments) {
      households.push({
        assessmentId: assessment.id,
        householdId: assessment.household.id,
        block: assessment.household.block,
        lot: assessment.household.lot,
        unit: assessment.household.unit,
        amountDue: assessment.amount.toNumber(),
        paidAmount: assessment.paidAmount.toNumber(),
        status: assessment.status,
        lastPaymentDate:
          assessment.payments[0]?.paymentDate?.toISOString() ?? null,
      });
    }

    households.sort((a, b) => {
      const labelA = `${a.block ?? ''}${a.lot ?? ''}`;
      const labelB = `${b.block ?? ''}${b.lot ?? ''}`;
      return labelA.localeCompare(labelB);
    });

    return { success: true, data: { summary, households } };
  }

  // ==========================================
  // Add households created after the month
  // ==========================================

  async syncHouseholds(communityId: string, periodKey: string) {
    if (!isValidPeriodKey(periodKey)) {
      throw new BadRequestException(
        'month must be in YYYY-MM format (e.g. 2026-08).',
      );
    }

    const chargeType = await this.resolveDuesChargeType(communityId);

    if (!chargeType) {
      throw new NotFoundException(
        'No recurring monthly dues charge type found. Configure it in Finance settings first.',
      );
    }

    const period = await this.prisma.billingPeriod.findFirst({
      where: {
        communityId,
        chargeTypeId: chargeType.id,
        periodKey,
        deletedAt: null,
      },
    });

    if (!period) {
      return {
        success: true,
        message: 'Nothing to sync for this month yet.',
        data: {
          periodKey,
          createdCount: 0,
          skippedCount: 0,
          householdCount: 0,
        },
      };
    }

    const result = await this.generateForPeriod({
      communityId,
      chargeTypeId: chargeType.id,
      chargeTypeName: chargeType.name,
      periodKey,
      amount: period.amount.toNumber(),
      dueDate: period.dueDate,
    });

    return {
      success: true,
      message:
        result.data.createdCount > 0
          ? `Added ${result.data.createdCount} missing household${
              result.data.createdCount === 1 ? '' : 's'
            }.`
          : 'Every active household is already billed for this month.',
      data: result.data,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async fetchDuesRows(communityId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: { not: AssessmentStatus.CANCELLED },
        chargeType: { category: FinanceCategory.DUES },
      },
      select: {
        status: true,
        amount: true,
        paidAmount: true,
        dueDate: true,
        period: true,
        billingPeriod: { select: { periodKey: true } },
      },
    });

    return assessments.map((assessment) => ({
      period: assessment.period,
      billingPeriodKey: assessment.billingPeriod?.periodKey ?? null,
      amount: assessment.amount.toNumber(),
      paidAmount: assessment.paidAmount.toNumber(),
      status: assessment.status,
      dueDate: assessment.dueDate,
    }));
  }

  private async resolveDuesChargeType(communityId: string) {
    return this.prisma.chargeType.findFirst({
      where: {
        communityId,
        deletedAt: null,
        isActive: true,
        category: FinanceCategory.DUES,
        recurrence: ChargeRecurrence.RECURRING,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Finds the community's recurring dues charge type or provisions a default. */
  private async ensureDuesChargeType(communityId: string) {
    const existing = await this.resolveDuesChargeType(communityId);
    if (existing) return existing;

    return this.prisma.chargeType.create({
      data: {
        communityId,
        code: 'MONTHLY_DUES',
        name: DEFAULT_DUES_NAME,
        category: FinanceCategory.DUES,
        recurrence: ChargeRecurrence.RECURRING,
        isActive: true,
        autoGenerate: false,
      },
    });
  }

  private async generateForPeriod(input: {
    communityId: string;
    chargeTypeId: string;
    chargeTypeName: string;
    periodKey: string;
    amount: number;
    dueDate: Date;
  }) {
    const { communityId, chargeTypeId, chargeTypeName, periodKey } = input;

    const billingPeriodId = await this.ensureBillingPeriod(
      communityId,
      chargeTypeId,
      chargeTypeName,
      input.periodKey,
      input.amount,
      input.dueDate,
    );

    const households = await this.prisma.household.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: HouseholdStatus.ACTIVE,
      },
      select: { id: true },
    });

    const existing = await this.prisma.assessment.findMany({
      where: {
        communityId,
        deletedAt: null,
        billingPeriodId,
        status: { not: AssessmentStatus.CANCELLED },
      },
      select: { householdId: true },
    });
    const billedHouseholds = new Set(
      existing.map((assessment) => assessment.householdId),
    );

    const eligible = households.filter(
      (household) => !billedHouseholds.has(household.id),
    );
    const skippedCount = households.length - eligible.length;

    let nextNumber = await this.nextAssessmentNumber(communityId);

    for (const household of eligible) {
      nextNumber += 1;
      await this.prisma.assessment.create({
        data: {
          communityId,
          assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
          title: `${chargeTypeName} — ${periodKey}`,
          householdId: household.id,
          amount: input.amount,
          dueDate: input.dueDate,
          period: periodKey,
          chargeTypeId,
          billingPeriodId,
          status: AssessmentStatus.ISSUED,
        },
      });
    }

    if (eligible.length > 0 && billingPeriodId) {
      await this.financeSyncService.syncPeriod(communityId, billingPeriodId);
    }

    return {
      data: {
        periodKey,
        createdCount: eligible.length,
        skippedCount,
        householdCount: households.length,
      },
    };
  }

  private async ensureBillingPeriod(
    communityId: string,
    chargeTypeId: string,
    chargeTypeName: string,
    periodKey: string,
    amount: number,
    dueDate: Date,
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

    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));

    const created = await this.prisma.billingPeriod.create({
      data: {
        communityId,
        chargeTypeId,
        periodKey,
        label: `${chargeTypeName} — ${periodKey}`,
        startDate: new Date(year, month - 1, 1),
        amount,
        dueDate,
        status: BillingPeriodStatus.OPEN,
      },
      select: { id: true },
    });

    return created.id;
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

  private dueDateFor(dueDay: number | null, periodKey: string): Date {
    const base = new Date(`${periodKey}-01T00:00:00`);
    const day = dueDay ?? base.getDate();
    const lastDay = new Date(
      base.getFullYear(),
      base.getMonth() + 1,
      0,
    ).getDate();
    return new Date(
      base.getFullYear(),
      base.getMonth(),
      Math.min(day, lastDay),
    );
  }
}

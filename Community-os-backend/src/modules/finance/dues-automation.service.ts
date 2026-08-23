import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  AssessmentStatus,
  BillingPeriodStatus,
  HouseholdStatus,
  LateFeeType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceSyncService } from './finance-sync.service';

interface ChargeTypeLike {
  id: string;
  name: string;
  amount: any;
  dueDay: number | null;
}

@Injectable()
export class DuesAutomationService {
  private readonly logger = new Logger(DuesAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeSyncService: FinanceSyncService,
  ) {}

  // ==========================================
  // Scheduled run: every day at 3 AM.
  // Idempotent — safe to re-run at any time.
  // ==========================================

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log('Running scheduled dues automation sweep...');
    const result = await this.run();
    this.logger.log(
      `Dues automation done: ${result.data.generated} generated, ${result.data.lateFees} late fees`,
    );
  }

  // ==========================================
  // Manual trigger endpoint support.
  // Optionally scoped to a single community.
  // ==========================================

  async run(communityId?: string) {
    const communities = await this.prisma.community.findMany({
      where: {
        deletedAt: null,
        ...(communityId ? { id: communityId } : {}),
      },
      select: { id: true },
    });

    let generated = 0;
    let lateFees = 0;

    for (const community of communities) {
      generated += await this.generateCurrentPeriod(community.id);
      lateFees += await this.applyLateFees(community.id);
    }

    return {
      success: true,
      message: 'Dues automation completed successfully.',
      data: { generated, lateFees },
    };
  }

  // ==========================================
  // Auto-generation: for every active
  // autoGenerate charge type, ensure a billing
  // period exists for the current month and
  // every ACTIVE household has exactly one
  // assessment for it.
  // ==========================================

  private async generateCurrentPeriod(communityId: string): Promise<number> {
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const chargeTypes = await this.prisma.chargeType.findMany({
      where: {
        communityId,
        deletedAt: null,
        isActive: true,
        autoGenerate: true,
      },
    });

    let createdCount = 0;

    for (const chargeType of chargeTypes) {
      const billingPeriodId = await this.ensureBillingPeriod(
        communityId,
        chargeType,
        periodKey,
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
        },
        select: { householdId: true },
      });
      const existingHouseholds = new Set(
        existing.map((assessment) => assessment.householdId),
      );

      const eligible = households.filter(
        (household) => !existingHouseholds.has(household.id),
      );
      if (eligible.length === 0) continue;

      let nextNumber = await this.nextAssessmentNumber(communityId);

      for (const household of eligible) {
        nextNumber += 1;
        await this.prisma.assessment.create({
          data: {
            communityId,
            assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
            title: `${chargeType.name} — ${periodKey}`,
            householdId: household.id,
            amount: chargeType.amount ?? 0,
            dueDate: this.dueDateFor(chargeType.dueDay, periodKey),
            period: periodKey,
            chargeTypeId: chargeType.id,
            billingPeriodId,
            status: AssessmentStatus.ISSUED,
          },
        });
        createdCount += 1;
      }

      if (createdCount > 0 && billingPeriodId) {
        await this.financeSyncService.syncPeriod(communityId, billingPeriodId);
      }
    }

    return createdCount;
  }

  // ==========================================
  // Late fees: for overdue recurring charges
  // whose due date + grace period has passed,
  // create a LATE_PENALTY assessment once per
  // source assessment.
  // ==========================================

  private async applyLateFees(communityId: string): Promise<number> {
    const chargeTypes = await this.prisma.chargeType.findMany({
      where: {
        communityId,
        deletedAt: null,
        lateFeeType: { not: LateFeeType.NONE },
        lateFeeValue: { not: null },
      },
    });

    if (chargeTypes.length === 0) return 0;

    let createdCount = 0;

    for (const chargeType of chargeTypes) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (chargeType.gracePeriodDays ?? 0));

      const overdue = await this.prisma.assessment.findMany({
        where: {
          communityId,
          deletedAt: null,
          chargeTypeId: chargeType.id,
          dueDate: { lt: cutoff },
          status: {
            in: [
              AssessmentStatus.OVERDUE,
              AssessmentStatus.ISSUED,
              AssessmentStatus.PARTIALLY_PAID,
            ],
          },
        },
      });

      for (const assessment of overdue) {
        const remaining =
          assessment.amount.toNumber() - assessment.paidAmount.toNumber();
        if (remaining <= 0) continue;

        const duplicate = await this.prisma.assessment.findFirst({
          where: {
            communityId,
            deletedAt: null,
            description: { contains: assessment.assessmentNumber },
            title: { startsWith: 'Late fee' },
          },
        });
        if (duplicate) continue;

        const amount = this.computeLateFee(
          chargeType.lateFeeType,
          chargeType.lateFeeValue?.toNumber() ?? 0,
          remaining,
        );
        if (amount <= 0) continue;

        let nextNumber = await this.nextAssessmentNumber(communityId);
        nextNumber += 1;

        await this.prisma.assessment.create({
          data: {
            communityId,
            assessmentNumber: `ASS-${String(nextNumber).padStart(6, '0')}`,
            title: `Late fee — ${assessment.title}`.slice(0, 200),
            description: `Late fee for ${assessment.assessmentNumber} (${chargeType.name}).`,
            householdId: assessment.householdId,
            amount,
            dueDate: assessment.dueDate,
            period: assessment.period,
            chargeTypeId: chargeType.id,
            status: AssessmentStatus.OVERDUE,
          },
        });
        createdCount += 1;
      }
    }

    return createdCount;
  }

  // ==========================================
  // Helpers
  // ==========================================

  private computeLateFee(
    type: LateFeeType,
    value: number,
    remainingBalance: number,
  ): number {
    if (type === LateFeeType.FIXED_AMOUNT) return value;
    if (type === LateFeeType.PERCENT) {
      return Math.round(remainingBalance * (value / 100) * 100) / 100;
    }
    return 0;
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

  private async ensureBillingPeriod(
    communityId: string,
    chargeType: ChargeTypeLike,
    periodKey: string,
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

    if (existing) return existing.id;

    const [year, month] = periodKey
      .split('-')
      .map((part) => parseInt(part, 10));

    const created = await this.prisma.billingPeriod.create({
      data: {
        communityId,
        chargeTypeId: chargeType.id,
        periodKey,
        label: `${chargeType.name} — ${periodKey}`,
        startDate: new Date(year, month - 1, 1),
        amount: chargeType.amount ?? 0,
        dueDate: this.dueDateFor(chargeType.dueDay, periodKey),
        status: BillingPeriodStatus.OPEN,
      },
      select: { id: true },
    });

    return created.id;
  }
}

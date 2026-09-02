import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  BillingCycle,
  InvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

  // ==========================================
  // Automated Sweep (runs daily + manual trigger)
  // ==========================================

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    this.logger.log('Running scheduled billing sweep...');
    const result = await this.sweep();
    this.logger.log(
      `Scheduled sweep done: ${result.data.overdue} overdue, ${result.data.expired} expired, ${result.data.renewed} auto-renewed`,
    );
  }

  async sweep() {
    const now = new Date();

    // Collect all community IDs with active exemptions
    const activeExemptions = await this.prisma.billingExemption.findMany({
      where: {
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { communityId: true },
    });
    const exemptCommunityIds = new Set(
      activeExemptions.map((e) => e.communityId),
    );

    // ==========================================
    // 1. Mark overdue invoices (ISSUED past due date) — skip exempt
    // ==========================================

    const overdueResult = await this.prisma.invoice.updateMany({
      where: {
        status: InvoiceStatus.ISSUED,
        dueDate: { lt: now },
        deletedAt: null,
        communityId: { notIn: [...exemptCommunityIds] },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    // ==========================================
    // 2. Expire or auto-renew lapsed subscriptions — skip exempt
    // ==========================================

    const lapsed = await this.prisma.subscription.findMany({
      where: {
        endsAt: { lt: now },
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
          ],
        },
        deletedAt: null,
      },
      include: {
        plan: true,
      },
    });

    let expired = 0;
    let renewed = 0;

    for (const subscription of lapsed) {
      // Skip exempt communities — keep subscription alive
      if (exemptCommunityIds.has(subscription.communityId)) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            endsAt: this.addCycle(
              new Date(subscription.endsAt),
              subscription.plan?.billingCycle ?? BillingCycle.MONTHLY,
            ),
            status: SubscriptionStatus.ACTIVE,
          },
        });
        renewed++;
        continue;
      }

      const canAutoRenew =
        subscription.status === SubscriptionStatus.ACTIVE &&
        subscription.autoRenew &&
        subscription.planId !== null;

      if (!canAutoRenew) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });
        expired++;
        continue;
      }

      const plan = subscription.plan;
      if (!plan) {
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });
        expired++;
        continue;
      }

      // Auto-renew: extend cycle from the lapsed end date, generate invoice
      const base = new Date(subscription.endsAt);
      const endsAt = this.addCycle(base, plan.billingCycle);

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          endsAt,
          status: SubscriptionStatus.ACTIVE,
          cancelledAt: null,
        },
      });

      if (Number(plan.price) > 0) {
        await this.createInvoice(
          subscription.communityId,
          subscription.id,
          Number(plan.price),
          plan.billingCycle,
          endsAt,
        );
      }

      // Sync features from plan after auto-renew
      try {
        await this.featuresService.syncFeaturesFromPlan(
          subscription.communityId,
          plan.id,
        );
      } catch (error) {
        this.logger.error(
          `Failed to sync features for community ${subscription.communityId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }

      renewed++;
    }

    return {
      success: true,
      message: 'Billing sweep completed successfully.',
      data: {
        overdue: overdueResult.count,
        expired,
        renewed,
        processed: overdueResult.count + expired + renewed,
        exemptCommunities: exemptCommunityIds.size,
        ranAt: now,
      },
    };
  }

  // ==========================================
  // Billing Summary (per community)
  // ==========================================

  async summary(communityId: string) {
    const now = new Date();

    const [current, invoices, outstanding, activeExemption] = await Promise.all(
      [
        this.prisma.subscription.findFirst({
          where: {
            communityId,
            deletedAt: null,
            status: {
              in: [
                SubscriptionStatus.TRIAL,
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PAST_DUE,
              ],
            },
          },
          include: { plan: true },
        }),
        this.prisma.invoice.findMany({
          where: {
            communityId,
            deletedAt: null,
            status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.WAIVED] },
          },
          select: { status: true, amount: true, dueDate: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            communityId,
            deletedAt: null,
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE] },
          },
          _sum: { amount: true },
        }),
        this.prisma.billingExemption.findFirst({
          where: {
            communityId,
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          select: { id: true, reason: true, startDate: true, endDate: true },
        }),
      ],
    );

    const byStatus: Record<string, number> = {
      [InvoiceStatus.DRAFT]: 0,
      [InvoiceStatus.ISSUED]: 0,
      [InvoiceStatus.OVERDUE]: 0,
      [InvoiceStatus.PAID]: 0,
    };

    for (const invoice of invoices) {
      if (byStatus[invoice.status] !== undefined) {
        byStatus[invoice.status]++;
      }
    }

    const expiringSoon =
      current && current.endsAt > new Date()
        ? await this.prisma.subscription.count({
            where: {
              communityId,
              endsAt: {
                gte: new Date(),
                lte: this.addDays(new Date(), 30),
              },
              status: SubscriptionStatus.ACTIVE,
            },
          })
        : 0;

    return {
      success: true,
      message: 'Billing summary retrieved successfully.',
      data: {
        subscription: current
          ? {
              status: current.status,
              plan: current.plan
                ? {
                    code: current.plan.code,
                    name: current.plan.name,
                    price: Number(current.plan.price),
                    billingCycle: current.plan.billingCycle,
                    tier: current.plan.tier,
                  }
                : null,
              startsAt: current.startsAt,
              endsAt: current.endsAt,
            }
          : null,
        invoices: {
          byStatus,
          total: invoices.length,
          outstandingAmount: outstanding._sum.amount
            ? Number(outstanding._sum.amount)
            : 0,
          expiringWithin30Days: expiringSoon,
        },
        exemption: activeExemption ?? null,
      },
    };
  }

  // ==========================================
  // Plan Usage & Limits (per community)
  // ==========================================

  async limits(communityId: string) {
    const current = await this.prisma.subscription.findFirst({
      where: {
        communityId,
        deletedAt: null,
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      },
      include: { plan: true },
    });

    const [users, residents, households] = await Promise.all([
      this.prisma.user.count({
        where: { communityId, deletedAt: null },
      }),
      this.prisma.resident.count({
        where: { communityId, deletedAt: null },
      }),
      this.prisma.household.count({
        where: { communityId, deletedAt: null },
      }),
    ]);

    const plan = current?.plan ?? null;

    return {
      success: true,
      message: 'Plan usage retrieved successfully.',
      data: {
        plan: plan
          ? {
              code: plan.code,
              name: plan.name,
            }
          : null,
        status: current?.status ?? null,
        usage: {
          users,
          residents,
          households,
        },
      },
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async createInvoice(
    communityId: string,
    subscriptionId: string,
    amount: number,
    billingCycle: BillingCycle,
    dueDate: Date,
  ) {
    const invoiceNumber = await this.nextInvoiceNumber(communityId);

    // Check if community has active billing exemption
    const now = new Date();
    const isExempt = await this.prisma.billingExemption.findFirst({
      where: {
        communityId,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    return this.prisma.invoice.create({
      data: {
        communityId,
        subscriptionId,
        invoiceNumber,
        amount: isExempt ? 0 : amount,
        billingCycle,
        status: isExempt ? InvoiceStatus.WAIVED : InvoiceStatus.ISSUED,
        dueDate,
      },
    });
  }

  private async nextInvoiceNumber(communityId: string) {
    const count = await this.prisma.invoice.count({
      where: { communityId },
    });

    return `INV-${String(count + 1).padStart(6, '0')}`;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addCycle(date: Date, cycle: BillingCycle): Date {
    const result = new Date(date);
    if (cycle === BillingCycle.MONTHLY) {
      result.setMonth(result.getMonth() + 1);
    } else {
      result.setFullYear(result.getFullYear() + 1);
    }
    return result;
  }
}

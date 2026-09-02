import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BillingCycle,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featuresService: FeaturesService,
  ) {}

  // ==========================================
  // Current Subscription
  // ==========================================

  async current(communityId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        communityId,
        deletedAt: null,
      },
      include: {
        plan: {
          include: {
            planFeatures: {
              include: {
                feature: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    description: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
        invoices: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return {
      success: true,
      message: 'Current subscription retrieved successfully.',
      data: subscription,
    };
  }

  // ==========================================
  // Get All Subscriptions
  // ==========================================

  async findAll(communityId: string, query: SubscriptionQueryDto) {
    const { page, limit, status } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {
      communityId,
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      success: true,
      message: 'Subscriptions retrieved successfully.',
      data: subscriptions,
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
  // Subscribe to a Plan
  // ==========================================

  async subscribe(communityId: string, dto: CreateSubscriptionDto) {
    // ==========================================
    // Validate Plan
    // ==========================================

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id: dto.planId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    // ==========================================
    // Enforce Plan Limits (prevent downgrade below usage)
    // ==========================================

    if (plan.maxResidents > 0 || plan.maxUsers > 0) {
      const [residentCount, userCount] = await Promise.all([
        this.prisma.resident.count({
          where: { communityId, deletedAt: null },
        }),
        this.prisma.user.count({
          where: { communityId, deletedAt: null },
        }),
      ]);

      if (plan.maxResidents > 0 && residentCount > plan.maxResidents) {
        throw new ConflictException(
          `Current resident count (${residentCount}) exceeds the plan limit (${plan.maxResidents}). Upgrade to a larger plan.`,
        );
      }

      if (plan.maxUsers > 0 && userCount > plan.maxUsers) {
        throw new ConflictException(
          `Current user count (${userCount}) exceeds the plan limit (${plan.maxUsers}). Upgrade to a larger plan.`,
        );
      }
    }

    // ==========================================
    // Ensure No Active Subscription
    // ==========================================

    const existing = await this.prisma.subscription.findFirst({
      where: {
        communityId,
        deletedAt: null,
      },
    });

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.TRIAL,
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.PAST_DUE,
    ];

    if (existing && activeStatuses.includes(existing.status)) {
      throw new ConflictException(
        'Community already has an active subscription. Cancel it first.',
      );
    }

    // ==========================================
    // Compute Dates
    // ==========================================

    const billingCycle = dto.billingCycle ?? plan.billingCycle;

    const startsAt = new Date();
    const trialDays = dto.trialDays ?? 0;
    const trialEndsAt =
      trialDays > 0 ? this.addDays(startsAt, trialDays) : null;

    const isTrial = trialEndsAt !== null;
    const endsAt = isTrial
      ? trialEndsAt
      : this.addCycle(startsAt, billingCycle);

    // ==========================================
    // Create or Reactivate Subscription
    // ==========================================

    const subscription = existing
      ? await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            status: isTrial
              ? SubscriptionStatus.TRIAL
              : SubscriptionStatus.ACTIVE,
            startsAt,
            endsAt,
            trialEndsAt,
            cancelledAt: null,
            autoRenew: true,
          },
          include: {
            plan: true,
          },
        })
      : await this.prisma.subscription.create({
          data: {
            communityId,
            planId: plan.id,
            status: isTrial
              ? SubscriptionStatus.TRIAL
              : SubscriptionStatus.ACTIVE,
            startsAt,
            endsAt,
            trialEndsAt,
            autoRenew: true,
          },
          include: {
            plan: true,
          },
        });

    // ==========================================
    // Create First Invoice (skip during trial)
    // ==========================================

    if (!isTrial && Number(plan.price) > 0) {
      await this.createInvoiceForSubscription(
        communityId,
        subscription.id,
        Number(plan.price),
        billingCycle,
        endsAt,
      );
    }

    // ==========================================
    // Sync Features from Plan
    // ==========================================

    await this.syncFeaturesFromPlan(communityId, plan.id);

    return {
      success: true,
      message: isTrial
        ? 'Subscription started with a trial period.'
        : 'Subscription activated successfully.',
      data: subscription,
    };
  }

  // ==========================================
  // Renew Subscription
  // ==========================================

  async renew(communityId: string, id: string) {
    const subscription = await this.findScoped(communityId, id);

    if (
      subscription.status === SubscriptionStatus.CANCELLED ||
      subscription.status === SubscriptionStatus.EXPIRED
    ) {
      throw new ConflictException(
        'Cancelled or expired subscriptions cannot be renewed.',
      );
    }

    if (!subscription.planId) {
      throw new ConflictException('Subscription has no plan to renew.');
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id: subscription.planId,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    const billingCycle = plan.billingCycle;

    const base =
      new Date(subscription.endsAt) > new Date()
        ? subscription.endsAt
        : new Date();

    const endsAt = this.addCycle(base, billingCycle);

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        endsAt,
        status: SubscriptionStatus.ACTIVE,
        cancelledAt: null,
        autoRenew: true,
      },
      include: {
        plan: true,
      },
    });

    if (Number(plan.price) > 0) {
      await this.createInvoiceForSubscription(
        communityId,
        subscription.id,
        Number(plan.price),
        billingCycle,
        endsAt,
      );
    }

    // ==========================================
    // Sync Features from Plan
    // ==========================================

    await this.syncFeaturesFromPlan(communityId, subscription.planId);

    return {
      success: true,
      message: 'Subscription renewed successfully.',
      data: updatedSubscription,
    };
  }

  // ==========================================
  // Cancel Subscription
  // ==========================================

  async cancel(communityId: string, id: string) {
    const subscription = await this.findScoped(communityId, id);

    if (
      subscription.status === SubscriptionStatus.CANCELLED ||
      subscription.status === SubscriptionStatus.EXPIRED
    ) {
      throw new ConflictException(
        'Subscription is already cancelled or expired.',
      );
    }

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        autoRenew: false,
      },
      include: {
        plan: true,
      },
    });

    // ==========================================
    // Revoke optional features on cancel
    // ==========================================

    await this.revokeOptionalFeatures(communityId);

    return {
      success: true,
      message: 'Subscription cancelled successfully.',
      data: updatedSubscription,
    };
  }

  // ==========================================
  // Generate Invoice
  // ==========================================

  async generateInvoice(communityId: string, id: string) {
    const subscription = await this.findScoped(communityId, id);

    if (
      subscription.status !== SubscriptionStatus.ACTIVE &&
      subscription.status !== SubscriptionStatus.TRIAL
    ) {
      throw new ConflictException('Only active subscriptions can be billed.');
    }

    if (!subscription.planId) {
      throw new ConflictException('Subscription has no plan to bill.');
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id: subscription.planId,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    const invoice = await this.createInvoiceForSubscription(
      communityId,
      subscription.id,
      Number(plan.price),
      plan.billingCycle,
      subscription.endsAt,
    );

    return {
      success: true,
      message: 'Invoice generated successfully.',
      data: invoice,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found.');
    }

    return subscription;
  }

  private async createInvoiceForSubscription(
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

  // ==========================================
  // Feature Sync from Plan
  // ==========================================

  async syncFeaturesFromPlan(communityId: string, planId: string) {
    // Get features linked to this plan
    const planFeatures = await this.prisma.planFeature.findMany({
      where: { planId },
      select: { featureId: true },
    });

    const planFeatureIds = new Set(planFeatures.map((pf) => pf.featureId));

    // Get all STANDARD features (always enabled)
    const standardFeatures = await this.prisma.feature.findMany({
      where: { type: 'STANDARD', isActive: true },
      select: { id: true },
    });

    const standardIds = new Set(standardFeatures.map((f) => f.id));

    // All features that should be enabled = plan features + standard features
    const desiredFeatureIds = new Set([...planFeatureIds, ...standardIds]);

    // Get current enabled features for this community
    const currentAssignments = await this.prisma.communityFeature.findMany({
      where: { communityId },
      select: { featureId: true, enabled: true },
    });

    const currentEnabled = new Set(
      currentAssignments.filter((a) => a.enabled).map((a) => a.featureId),
    );

    // Enable features from plan that aren't already enabled
    const toEnable = [...desiredFeatureIds].filter(
      (id) => !currentEnabled.has(id),
    );

    if (toEnable.length > 0) {
      await this.prisma.communityFeature.createMany({
        data: toEnable.map((featureId) => ({
          communityId,
          featureId,
          enabled: true,
          enabledAt: new Date(),
        })),
        skipDuplicates: true,
      });

      // Update any disabled features back to enabled
      await this.prisma.communityFeature.updateMany({
        where: {
          communityId,
          featureId: { in: toEnable },
          enabled: false,
        },
        data: { enabled: true, disabledAt: null, disabledBy: null },
      });
    }

    // Revoke OPTIONAL features NOT in the plan (standard features are never revoked)
    const toRevoke = currentAssignments.filter(
      (a) => a.enabled && !desiredFeatureIds.has(a.featureId),
    );

    if (toRevoke.length > 0) {
      const revokeIds = toRevoke.map((a) => a.featureId);

      // Only revoke OPTIONAL features
      const optionalToRevoke = await this.prisma.feature.findMany({
        where: { id: { in: revokeIds }, type: 'OPTIONAL' },
        select: { id: true },
      });

      if (optionalToRevoke.length > 0) {
        await this.prisma.communityFeature.deleteMany({
          where: {
            communityId,
            featureId: { in: optionalToRevoke.map((f) => f.id) },
          },
        });
      }
    }
  }

  async revokeOptionalFeatures(communityId: string) {
    await this.prisma.communityFeature.deleteMany({
      where: {
        communityId,
        feature: { type: 'OPTIONAL' },
      },
    });
  }
}

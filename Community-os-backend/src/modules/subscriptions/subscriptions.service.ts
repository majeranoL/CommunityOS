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

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

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
        plan: true,
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

    return this.prisma.invoice.create({
      data: {
        communityId,
        subscriptionId,
        invoiceNumber,
        amount,
        billingCycle,
        status: InvoiceStatus.ISSUED,
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

import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  BillingCycle,
  CommunityStatus,
  Invoice,
  InvoiceStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { MarkPaidInvoiceDto } from './dto/mark-paid.dto';

import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';
import { FeaturesService } from '../features/features.service';
import { ExpensesService } from '../finance/expenses.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentsGatewayService,
    private readonly featuresService: FeaturesService,
    private readonly expensesService: ExpensesService,
  ) {}

  // ==========================================
  // Create Invoice
  // ==========================================

  async create(communityId: string, dto: CreateInvoiceDto) {
    // ==========================================
    // Validate Subscription
    // ==========================================

    if (dto.subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          id: dto.subscriptionId,
          communityId,
          deletedAt: null,
        },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found.');
      }
    }

    // ==========================================
    // Generate Invoice Number
    // ==========================================

    const count = await this.prisma.invoice.count({
      where: { communityId },
    });

    const invoiceNumber = `INV-${String(count + 1).padStart(6, '0')}`;

    // ==========================================
    // Create Invoice
    // ==========================================

    const invoice = await this.prisma.invoice.create({
      data: {
        communityId,
        subscriptionId: dto.subscriptionId,
        invoiceNumber,
        amount: dto.amount,
        billingCycle: dto.billingCycle ?? BillingCycle.MONTHLY,
        status: InvoiceStatus.DRAFT,
        dueDate: new Date(dto.dueDate),
        paymentMethod: dto.paymentMethod,
        notes: dto.notes?.trim(),
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Invoice created successfully.',
      data: invoice,
    };
  }

  // ==========================================
  // Get All Invoices
  // ==========================================

  async findAll(communityId: string, query: InvoiceQueryDto) {
    const { page, limit, status, paid, subscriptionId, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      communityId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(paid === true ? { status: InvoiceStatus.PAID } : {}),
      ...(paid === false ? { status: { not: InvoiceStatus.PAID } } : {}),
      ...(subscriptionId ? { subscriptionId } : {}),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      success: true,
      message: 'Invoices retrieved successfully.',
      data: invoices,
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
  // Get Invoice By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    return {
      success: true,
      message: 'Invoice retrieved successfully.',
      data: invoice,
    };
  }

  // ==========================================
  // Update Invoice
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findScoped(communityId, id);

    if (dto.subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          id: dto.subscriptionId,
          communityId,
          deletedAt: null,
        },
      });

      if (!subscription) {
        throw new NotFoundException('Subscription not found.');
      }
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.subscriptionId && { subscriptionId: dto.subscriptionId }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.billingCycle && { billingCycle: dto.billingCycle }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.paymentMethod !== undefined && {
          paymentMethod: dto.paymentMethod,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() }),
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Invoice updated successfully.',
      data: updatedInvoice,
    };
  }

  // ==========================================
  // Mark Invoice as Paid
  // ==========================================

  private async reactivateCommunityIfSuspended(communityId: string) {
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

  async markPaid(
    communityId: string,
    id: string,
    dto: MarkPaidInvoiceDto,
    userId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
      include: {
        subscription: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new ConflictException('Void invoices cannot be marked as paid.');
    }

    const resolvedPaymentMethod = dto.paymentMethod ?? invoice.paymentMethod;

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paymentMethod: resolvedPaymentMethod,
      },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    // ==========================================
    // Activate a trial subscription on first payment
    // ==========================================

    const subscription = invoice.subscription;
    if (
      subscription?.status === SubscriptionStatus.TRIAL &&
      subscription.planId
    ) {
      const plan = await this.prisma.subscriptionPlan.findFirst({
        where: { id: subscription.planId, deletedAt: null },
      });

      if (plan) {
        const newEndsAt = this.addCycle(
          new Date(subscription.endsAt) > new Date()
            ? subscription.endsAt
            : new Date(),
          plan.billingCycle ?? BillingCycle.MONTHLY,
        );

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.ACTIVE,
            endsAt: newEndsAt,
            cancelledAt: null,
            autoRenew: true,
          },
        });

        await this.featuresService.syncFeaturesFromPlan(communityId, plan.id);
      }
    }

    await this.reactivateCommunityIfSuspended(communityId);

    await this.recordSubscriptionExpense(
      { ...invoice, paymentMethod: resolvedPaymentMethod },
      userId,
    );

    return {
      success: true,
      message: 'Invoice marked as paid.',
      data: updatedInvoice,
    };
  }

  // ==========================================
  // Create a Gateway (online) Checkout for a subscription invoice
  // ==========================================

  async createGatewayCheckout(communityId: string, id: string) {
    if (!this.gateway.enabled) {
      throw new BadRequestException(
        'Online payment gateway is not configured.',
      );
    }

    const invoice = await this.findScoped(communityId, id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException('Paid invoices cannot be checked out.');
    }
    if (invoice.status === InvoiceStatus.VOID) {
      throw new ConflictException('Void invoices cannot be checked out.');
    }

    // Reuse an active checkout instead of leaving the resident on a
    // PROCESSING invoice or creating duplicate gateway sessions.
    if (
      invoice.status === InvoiceStatus.PROCESSING &&
      invoice.gatewayInvoiceId &&
      invoice.checkoutUrl
    ) {
      return {
        success: true,
        message: 'Checkout already exists. Redirect to the checkout URL.',
        data: {
          invoiceId: invoice.id,
          checkoutUrl: invoice.checkoutUrl,
          gatewayId: invoice.gatewayInvoiceId,
        },
      };
    }

    const retryStatus =
      invoice.status === InvoiceStatus.PROCESSING
        ? InvoiceStatus.ISSUED
        : invoice.status;

    let checkout: Awaited<ReturnType<PaymentsGatewayService['createCheckout']>>;
    try {
      checkout = await this.gateway.createCheckout({
        amount: Number(invoice.amount),
        currency: 'PHP',
        description: `CommunityOS subscription invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceId: invoice.id,
          communityId,
          type: 'invoice',
        },
        successUrl: `${this.appUrl()}/app/billing`,
        failureUrl: `${this.appUrl()}/app/billing`,
      });
    } catch (error) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: retryStatus },
      });
      throw error;
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PROCESSING,
        gatewayProvider: 'paymongo',
        gatewayInvoiceId: checkout.gatewayId,
        checkoutUrl: checkout.checkoutUrl,
      },
    });

    return {
      success: true,
      message: 'Checkout created. Redirect to the checkout URL.',
      data: {
        invoiceId: invoice.id,
        checkoutUrl: checkout.checkoutUrl,
        gatewayId: checkout.gatewayId,
      },
    };
  }

  // ==========================================
  // Gateway webhook transition (verified by gateway module)
  // ==========================================

  async markGatewayPaidByGateway(gatewayInvoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { gatewayInvoiceId, deletedAt: null },
    });

    if (!invoice) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    if (invoice.status !== InvoiceStatus.PROCESSING) {
      return { success: false, reason: 'ALREADY_FINAL' };
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paymentMethod: 'ONLINE',
      },
    });

    await this.reactivateCommunityIfSuspended(invoice.communityId);

    await this.recordSubscriptionExpense({
      ...invoice,
      paymentMethod: 'ONLINE',
    });

    return { success: true, invoice: updatedInvoice };
  }

  // ==========================================
  // Gateway FAILED / EXPIRED webhook transition
  // ==========================================

  async markGatewayFailedByGateway(gatewayInvoiceId: string) {
    return this.clearInvoiceGatewaySession(gatewayInvoiceId);
  }

  async markGatewayExpiredByGateway(gatewayInvoiceId: string) {
    return this.clearInvoiceGatewaySession(gatewayInvoiceId);
  }

  // Reverts a PROCESSING invoice back to ISSUED when the gateway session was
  // not paid (failed or expired), so the invoice can be checked out again.
  private async clearInvoiceGatewaySession(gatewayInvoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { gatewayInvoiceId, deletedAt: null },
    });

    if (!invoice) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    if (invoice.status !== InvoiceStatus.PROCESSING) {
      return { success: false, reason: 'ALREADY_FINAL' };
    }

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.ISSUED,
        gatewayProvider: null,
        gatewayInvoiceId: null,
        checkoutUrl: null,
      },
    });

    return { success: true };
  }

  // ==========================================
  // Gateway reconciliation (PROCESSING -> PAID/ISSUED)
  // ==========================================

  // Resolves a PROCESSING invoice against the wallet provider's current
  // checkout state. Paid => PAID; otherwise back to ISSUED. Reconciles
  // missed webhooks and abandoned checkouts.
  async syncWithGateway(communityId: string, id: string) {
    return this.settleInvoiceGatewaySession(communityId, id);
  }

  private async settleInvoiceGatewaySession(communityId: string, id: string) {
    const invoice = await this.findScoped(communityId, id);

    if (
      invoice.status !== InvoiceStatus.PROCESSING ||
      !invoice.gatewayInvoiceId
    ) {
      return { success: true, status: invoice.status, reason: 'NOT_APPLICABLE' };
    }

    let checkout: Record<string, unknown>;
    try {
      checkout = await this.gateway.retrieveCheckout(invoice.gatewayInvoiceId);
    } catch {
      // Gateway unreachable. Leave the invoice PROCESSING and retry later
      // rather than risking a wrongly-reverted record for a paid session.
      return {
        success: false,
        reason: 'GATEWAY_UNREACHABLE',
        status: invoice.status,
      };
    }

    const paid = this.isCheckoutPaid(checkout);
    if (paid) {
      await this.markGatewayPaidByGateway(invoice.gatewayInvoiceId);
    } else {
      await this.clearInvoiceGatewaySession(invoice.gatewayInvoiceId);
    }

    const updated = await this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      select: { status: true },
    });

    return {
      success: true,
      reason: paid ? 'PAID' : 'RESET_TO_ISSUED',
      status: updated?.status ?? invoice.status,
    };
  }

  private isCheckoutPaid(checkout: Record<string, unknown>): boolean {
    const attributes = (checkout as { data?: { attributes?: any } })?.data
      ?.attributes;
    const status = attributes?.status;
    return (
      status === 'paid' || status === 'payment_paid' || attributes?.paid === true
    );
  }

  // ==========================================
  // Abandoned-gateway sweep
  // ==========================================

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepStaleInvoiceCheckouts() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const stale = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.PROCESSING,
        gatewayProvider: 'paymongo',
        gatewayInvoiceId: { not: null },
        updatedAt: { lt: cutoff },
        deletedAt: null,
      },
      select: { id: true, communityId: true },
    });

    for (const invoice of stale) {
      try {
        await this.settleInvoiceGatewaySession(invoice.communityId, invoice.id);
      } catch (error) {
        // Individual failures must not block the rest of the sweep.
        console.error(
          `Sweep: failed to reconcile invoice ${invoice.id}:`,
          error,
        );
      }
    }
  }

  // ==========================================
  // Void Invoice
  // ==========================================

  async void(communityId: string, id: string) {
    const invoice = await this.findScoped(communityId, id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException('Paid invoices cannot be voided.');
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.VOID,
      },
    });

    return {
      success: true,
      message: 'Invoice voided successfully.',
      data: updatedInvoice,
    };
  }

  // ==========================================
  // Delete Invoice (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    await this.prisma.invoice.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Invoice deleted successfully.',
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    return invoice;
  }

  // ==========================================
  // Record the paid subscription as a community expense so officers can
  // see the platform spend in the community finances. Idempotent.
  // ==========================================

  private async recordSubscriptionExpense(invoice: Invoice, userId?: string) {
    try {
      await this.expensesService.createSubscriptionExpense({
        communityId: invoice.communityId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: Number(invoice.amount),
        paidAt: invoice.paidAt ?? new Date(),
        paymentMethod: invoice.paymentMethod,
        createdById: userId,
      });
    } catch (error) {
      // A subscription expense is informational (transparency in the
      // community finance ledger); a failure must not break the payment.

      console.error(
        `Failed to record subscription expense for invoice ${invoice.invoiceNumber}:`,
        error,
      );
    }
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

  private appUrl(): string {
    return (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  }
}

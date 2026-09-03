import {
  ConflictException,
  BadRequestException,
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

import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceQueryDto } from './dto/invoice-query.dto';
import { MarkPaidInvoiceDto } from './dto/mark-paid.dto';

import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';
import { FeaturesService } from '../features/features.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentsGatewayService,
    private readonly featuresService: FeaturesService,
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

  async markPaid(communityId: string, id: string, dto: MarkPaidInvoiceDto) {
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

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        paymentMethod: dto.paymentMethod ?? invoice.paymentMethod,
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

    const checkout = await this.gateway.createCheckout({
      amount: Number(invoice.amount),
      currency: 'PHP',
      description: `CommunityOS subscription invoice ${invoice.invoiceNumber}`,
      metadata: {
        invoiceId: invoice.id,
        communityId,
        type: 'invoice',
      },
    });

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

    return { success: true, invoice: updatedInvoice };
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

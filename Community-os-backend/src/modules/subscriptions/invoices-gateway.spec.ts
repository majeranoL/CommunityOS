import { Test, TestingModule } from '@nestjs/testing';

import { InvoiceStatus } from '@prisma/client';

import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../prisma/prisma.service';

import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';
import { FeaturesService } from '../features/features.service';

describe('InvoicesService gateway invoice flow', () => {
  let service: InvoicesService;
  let prisma: {
    invoice: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findScoped: jest.Mock;
    };
  };
  let gateway: { enabled: boolean; createCheckout: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation((args) => args.data),
        findScoped: jest.fn(),
      },
      community: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    gateway = {
      enabled: true,
      createCheckout: jest.fn().mockResolvedValue({
        gatewayId: 'cses_123',
        checkoutUrl: 'https://checkout.paymongo.com/abc',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsGatewayService, useValue: gateway },
        {
          provide: FeaturesService,
          useValue: { syncFeaturesFromPlan: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('marks a PROCESSING invoice as PAID on gateway success', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1',
      status: InvoiceStatus.PROCESSING,
      gatewayInvoiceId: 'cses_123',
      deletedAt: null,
    });

    const result = await service.markGatewayPaidByGateway('cses_123');

    expect(result.success).toBe(true);
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InvoiceStatus.PAID,
          paymentMethod: 'ONLINE',
        }),
      }),
    );
  });

  it('does not overwrite a non-PROCESSING invoice', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-2',
      status: InvoiceStatus.PAID,
      gatewayInvoiceId: 'cses_123',
      deletedAt: null,
    });

    const result = await service.markGatewayPaidByGateway('cses_123');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('ALREADY_FINAL');
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it('returns NOT_FOUND for an unknown gateway id', async () => {
    prisma.invoice.findFirst.mockResolvedValue(null);

    const result = await service.markGatewayPaidByGateway('missing');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });

  it('reactivates a suspended community on gateway success', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-gw',
      communityId: 'community-1',
      status: InvoiceStatus.PROCESSING,
      gatewayInvoiceId: 'cses_123',
      deletedAt: null,
    });
    prisma.community.findFirst.mockResolvedValue({
      id: 'community-1',
      status: 'INACTIVE',
    });

    const result = await service.markGatewayPaidByGateway('cses_123');

    expect(result.success).toBe(true);
    expect(prisma.community.update).toHaveBeenCalledWith({
      where: { id: 'community-1' },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
      },
    });
  });
});

describe('InvoicesService markPaid trial activation', () => {
  let service: InvoicesService;
  let prisma: any;
  const featuresService = {
    syncFeaturesFromPlan: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    featuresService.syncFeaturesFromPlan.mockClear();
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation((args) => ({
          ...args.data,
          subscription: { plan: { price: '1000' }, status: 'TRIAL' },
        })),
      },
      subscriptionPlan: {
        findFirst: jest.fn(),
      },
      subscription: {
        update: jest.fn().mockImplementation((args) => args.data),
      },
      community: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentsGatewayService, useValue: { enabled: true } },
        { provide: FeaturesService, useValue: featuresService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('activates a TRIAL subscription when its invoice is marked paid', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1',
      status: InvoiceStatus.ISSUED,
      paymentMethod: null,
      deletedAt: null,
      subscription: {
        id: 'sub-1',
        status: 'TRIAL',
        planId: 'plan-1',
        endsAt: new Date(Date.now() + 86400000),
      },
    });
    prisma.subscriptionPlan.findFirst.mockResolvedValue({
      id: 'plan-1',
      name: 'Standard',
      price: '1000',
      billingCycle: 'MONTHLY',
    });

    await service.markPaid('community-1', 'inv-1', {});

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sub-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          autoRenew: true,
        }),
      }),
    );
    expect(featuresService.syncFeaturesFromPlan).toHaveBeenCalledWith(
      'community-1',
      'plan-1',
    );
  });

  it('does not activate a subscription for a non-TRIAL invoice', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-2',
      status: InvoiceStatus.ISSUED,
      paymentMethod: null,
      deletedAt: null,
      subscription: {
        id: 'sub-2',
        status: 'ACTIVE',
        planId: 'plan-1',
        endsAt: new Date(Date.now() + 86400000),
      },
    });

    await service.markPaid('community-1', 'inv-2', {});

    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(featuresService.syncFeaturesFromPlan).not.toHaveBeenCalled();
  });

  it('reactivates a suspended community when its invoice is marked paid', async () => {
    prisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-3',
      status: InvoiceStatus.ISSUED,
      paymentMethod: null,
      deletedAt: null,
      subscription: null,
    });
    prisma.community.findFirst.mockResolvedValue({
      id: 'community-1',
      status: 'INACTIVE',
      suspensionReason: 'unpaid',
    });

    await service.markPaid('community-1', 'inv-3', {});

    expect(prisma.community.update).toHaveBeenCalledWith({
      where: { id: 'community-1' },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
      },
    });
  });
});

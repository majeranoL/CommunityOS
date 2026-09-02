import { Test, TestingModule } from '@nestjs/testing';

import {
  BillingCycle,
  InvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { BillingService } from './billing.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FeaturesService } from '../features/features.service';

describe('BillingService.sweep', () => {
  let service: BillingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      invoice: {
        updateMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      subscription: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      billingExemption: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: FeaturesService,
          useValue: { syncFeaturesFromPlan: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('marks overdue invoices, expires non-renewable subs, renews active ones', async () => {
    prisma.invoice.updateMany.mockResolvedValue({ count: 3 });
    prisma.invoice.count.mockResolvedValue(0);
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 's1',
        communityId: 'c1',
        status: SubscriptionStatus.TRIAL,
        autoRenew: false,
        planId: null,
        endsAt: new Date('2020-01-01'),
        plan: null,
      },
      {
        id: 's2',
        communityId: 'c1',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        planId: 'p1',
        endsAt: new Date('2020-01-01'),
        plan: {
          id: 'p1',
          price: '100',
          billingCycle: BillingCycle.MONTHLY,
        },
      },
    ]);

    const result = await service.sweep();

    expect(result.data).toMatchObject({ overdue: 3, expired: 1, renewed: 1 });
    expect(prisma.subscription.update).toHaveBeenCalledTimes(2);
    expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: InvoiceStatus.ISSUED,
        }),
        data: { status: InvoiceStatus.OVERDUE },
      }),
    );
  });

  it('expires lapsed PAST_DUE subscriptions even when autoRenew is enabled', async () => {
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 's3',
        communityId: 'c1',
        status: SubscriptionStatus.PAST_DUE,
        autoRenew: true,
        planId: 'p1',
        endsAt: new Date('2020-01-01'),
        plan: { id: 'p1', price: '100', billingCycle: BillingCycle.MONTHLY },
      },
    ]);

    const result = await service.sweep();

    expect(result.data).toMatchObject({ overdue: 0, expired: 1, renewed: 0 });
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it('renews a zero-price plan without generating an invoice', async () => {
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 's4',
        communityId: 'c1',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        planId: 'p2',
        endsAt: new Date('2020-01-01'),
        plan: {
          id: 'p2',
          price: '0',
          billingCycle: BillingCycle.YEARLY,
        },
      },
    ]);

    const result = await service.sweep();

    expect(result.data).toMatchObject({ overdue: 0, expired: 0, renewed: 1 });
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it('skips overdue marking for exempt communities and auto-renews them', async () => {
    prisma.billingExemption.findMany.mockResolvedValue([{ communityId: 'c1' }]);
    prisma.invoice.updateMany.mockResolvedValue({ count: 0 });
    prisma.subscription.findMany.mockResolvedValue([
      {
        id: 's5',
        communityId: 'c1',
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        planId: 'p1',
        endsAt: new Date('2020-01-01'),
        plan: {
          id: 'p1',
          price: '100',
          billingCycle: BillingCycle.MONTHLY,
        },
      },
    ]);

    const result = await service.sweep();

    expect(result.data).toMatchObject({
      overdue: 0,
      expired: 0,
      renewed: 1,
      exemptCommunities: 1,
    });
    expect(prisma.invoice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          communityId: { notIn: ['c1'] },
        }),
      }),
    );
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: SubscriptionStatus.ACTIVE }),
      }),
    );
  });
});

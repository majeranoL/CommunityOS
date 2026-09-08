import { Test, TestingModule } from '@nestjs/testing';

import { CommunityStatus, PaymentStatus } from '@prisma/client';

import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceSyncService } from './finance-sync.service';
import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';

describe('PaymentsService gateway transitions', () => {
  let service: PaymentsService;
  let prisma: {
    payment: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    paymentAllocation: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    householdCredit: {
      updateMany: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
    community: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  const buildPayment = (status: PaymentStatus) => ({
    id: 'pay-1',
    communityId: 'c1',
    residentId: 'r1',
    paymentNumber: 'PAY-000001',
    amount: 1000,
    status,
    gatewayId: 'cses_123',
    deletedAt: null,
  });

  beforeEach(async () => {
    prisma = {
      payment: {
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation((args) => args.data),
      },
      paymentAllocation: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      householdCredit: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      community: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: { notifyMany: jest.fn() } },
        {
          provide: FinanceSyncService,
          useValue: { syncAssessment: jest.fn() },
        },
        {
          provide: PaymentsGatewayService,
          useValue: { enabled: true },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('marks a PROCESSING payment VERIFIED on gateway success', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      buildPayment(PaymentStatus.PROCESSING),
    );

    const result = await service.markGatewaySucceeded('cses_123');

    expect(result.success).toBe(true);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.VERIFIED,
          paidAt: expect.any(Date),
        }),
      }),
    );
  });

  it('reactivates an inactive community after successful dues payment', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      buildPayment(PaymentStatus.PROCESSING),
    );
    prisma.community.findFirst.mockResolvedValue({
      id: 'c1',
      status: CommunityStatus.INACTIVE,
      suspensionReason: 'unpaid',
    });

    const result = await service.markGatewaySucceeded('cses_123');

    expect(result.success).toBe(true);
    expect(prisma.community.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        status: CommunityStatus.ACTIVE,
        suspendedAt: null,
        suspensionReason: null,
      },
    });
  });

  it('does not reactivate a manually inactive community after payment', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      buildPayment(PaymentStatus.PROCESSING),
    );
    prisma.community.findFirst.mockResolvedValue({
      id: 'c1',
      status: CommunityStatus.INACTIVE,
      suspensionReason: 'manual',
    });

    const result = await service.markGatewaySucceeded('cses_123');

    expect(result.success).toBe(true);
    expect(prisma.community.update).not.toHaveBeenCalled();
  });

  it('does not re-verify an already-final payment', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      buildPayment(PaymentStatus.VERIFIED),
    );

    const result = await service.markGatewaySucceeded('cses_123');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('ALREADY_FINAL');
    expect(prisma.payment.update).not.toHaveBeenCalled();
  });

  it('marks a PROCESSING payment FAILED on gateway failure', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      buildPayment(PaymentStatus.PROCESSING),
    );

    const result = await service.markGatewayFailed('cses_123');

    expect(result.success).toBe(true);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: PaymentStatus.FAILED }),
      }),
    );
  });

  it('clears unapplied advance credit when a verified payment is refunded', async () => {
    prisma.payment.findFirst.mockResolvedValue(
      buildPayment(PaymentStatus.VERIFIED),
    );

    const result = await service.refund('c1', 'pay-1', 'user-1');

    expect(result.success).toBe(true);
    expect(prisma.householdCredit.updateMany).toHaveBeenCalledWith({
      where: { sourcePaymentId: 'pay-1', balance: { gt: 0 } },
      data: { balance: 0 },
    });
  });

  it('returns NOT_FOUND for an unknown gateway id', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    const result = await service.markGatewaySucceeded('nope');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });
});

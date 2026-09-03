import { Test, TestingModule } from '@nestjs/testing';

import { PaymentStatus } from '@prisma/client';

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
    user: {
      findFirst: jest.Mock;
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
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
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

  it('returns NOT_FOUND for an unknown gateway id', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    const result = await service.markGatewaySucceeded('nope');

    expect(result.success).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });
});

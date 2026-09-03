import { Test, TestingModule } from '@nestjs/testing';

import { InvoiceStatus } from '@prisma/client';

import { InvoicesService } from './invoices.service';
import { PrismaService } from '../../prisma/prisma.service';

import { PaymentsGatewayService } from '../payments-gateway/payments-gateway.service';

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
});

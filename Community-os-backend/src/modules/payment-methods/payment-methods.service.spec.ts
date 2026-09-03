import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import {
  PaymentMethodConfigDisplay,
  PaymentMethodConfigMethod,
} from '@prisma/client';

import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let prisma: {
    paymentMethodConfig: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const communityScope = { communityId: 'comm-1' };
  const platformScope = { communityId: null };

  beforeEach(async () => {
    prisma = {
      paymentMethodConfig: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockImplementation((args) => ({ id: 'cfg-1', ...args.data })),
        update: jest
          .fn()
          .mockImplementation((args) => ({ id: 'cfg-1', ...args.data })),
        delete: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
  });

  describe('save', () => {
    it('creates a platform-wide config when communityId is null', async () => {
      const result = await service.save(platformScope, {
        method: PaymentMethodConfigMethod.GCASH,
        displayMode: PaymentMethodConfigDisplay.QR,
        accountName: 'HOA Assoc',
        qrUrl: '/api/uploads/abc',
      });

      expect(prisma.paymentMethodConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            communityId: null,
            method: PaymentMethodConfigMethod.GCASH,
          }),
        }),
      );
      expect(result.communityId).toBeNull();
    });

    it('creates a community-scoped config (dues) with the given communityId', async () => {
      await service.save(communityScope, {
        method: PaymentMethodConfigMethod.MAYA,
        displayMode: PaymentMethodConfigDisplay.NUMBER,
        accountNumber: '09171234567',
      });

      expect(prisma.paymentMethodConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            communityId: 'comm-1',
            method: PaymentMethodConfigMethod.MAYA,
          }),
        }),
      );
    });

    it('rejects a NUMBER display mode without an account number', async () => {
      await expect(
        service.save(communityScope, {
          method: PaymentMethodConfigMethod.MAYA,
          displayMode: PaymentMethodConfigDisplay.NUMBER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a QR display mode without a QR image', async () => {
      await expect(
        service.save(communityScope, {
          method: PaymentMethodConfigMethod.GCASH,
          displayMode: PaymentMethodConfigDisplay.QR,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('enforces the active-config limit per scope', async () => {
      prisma.paymentMethodConfig.count.mockResolvedValue(3);

      await expect(
        service.save(communityScope, {
          method: PaymentMethodConfigMethod.BANK_TRANSFER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates an existing config instead of creating a duplicate', async () => {
      prisma.paymentMethodConfig.findFirst.mockResolvedValue({
        id: 'cfg-x',
        accountName: 'Old',
        accountNumber: null,
        qrFileId: null,
        qrUrl: null,
        instructions: null,
        isActive: true,
      });

      await service.save(communityScope, {
        method: PaymentMethodConfigMethod.GCASH,
        displayMode: PaymentMethodConfigDisplay.BOTH,
        accountNumber: '123',
        qrUrl: '/api/uploads/xyz',
      });

      expect(prisma.paymentMethodConfig.update).toHaveBeenCalledTimes(1);
      expect(prisma.paymentMethodConfig.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns a row for every method, marking unconfigured ones', async () => {
      prisma.paymentMethodConfig.findMany.mockResolvedValue([
        { method: PaymentMethodConfigMethod.GCASH, displayMode: 'QR' },
      ]);

      const result = await service.findAll(communityScope);

      expect(result.data).toHaveLength(3);
      const gcash = result.data.find(
        (m: any) => m.method === PaymentMethodConfigMethod.GCASH,
      ) as any;
      expect(gcash.configured).toBe(true);
      const maya = result.data.find(
        (m: any) => m.method === PaymentMethodConfigMethod.MAYA,
      ) as any;
      expect(maya.configured).toBe(false);
    });
  });

  describe('findActive', () => {
    it('returns only active configs', async () => {
      prisma.paymentMethodConfig.findMany.mockResolvedValue([
        {
          method: PaymentMethodConfigMethod.GCASH,
          displayMode: 'QR',
          isActive: true,
        },
      ]);

      const result = await service.findActive(communityScope);

      expect(result.data).toHaveLength(1);
      expect(prisma.paymentMethodConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            communityId: 'comm-1',
            isActive: true,
          }),
        }),
      );
    });
  });
});

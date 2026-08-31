import { NotFoundException } from '@nestjs/common';

import { AssessmentStatus } from '@prisma/client';

import { GoodStandingService } from './good-standing.service';

describe('GoodStandingService', () => {
  const communityId = 'community-1';
  const householdId = 'household-1';

  const standingQrs = {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  };

  const prisma = {
    household: { findFirst: jest.fn() },
    assessment: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
    goodStandingQR: standingQrs,
    $transaction: jest.fn(),
  };

  const featuresService = { getConfig: jest.fn() };

  let service: GoodStandingService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.assessment.findMany.mockResolvedValue([
      {
        householdId,
        amount: { toNumber: () => 1000 },
        dueDate: new Date('2026-01-05'),
        status: AssessmentStatus.OVERDUE,
      },
      {
        householdId,
        amount: { toNumber: () => 1000 },
        dueDate: new Date('2026-02-05'),
        status: AssessmentStatus.OVERDUE,
      },
      {
        householdId,
        amount: { toNumber: () => 1000 },
        dueDate: new Date('2026-03-05'),
        status: AssessmentStatus.OVERDUE,
      },
    ]);
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(([assessments, payments]) =>
      Promise.all([assessments, payments]),
    );
    featuresService.getConfig.mockResolvedValue({});

    service = new GoodStandingService(
      prisma as never,
      featuresService as never,
    );
  });

  describe('generate', () => {
    it('creates a QR pass for the household with a 24h expiry', async () => {
      prisma.household.findFirst.mockResolvedValue({ id: householdId });
      standingQrs.create.mockImplementation(({ data, select }) => ({
        token: data.token,
        standing: data.standing,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt ?? new Date(),
        ...Object.fromEntries(
          select ? Object.keys(select).map((key) => [key, data[key]]) : [],
        ),
      }));

      const before = Date.now();
      const result = await service.generate(communityId, householdId);
      const after = Date.now();

      expect(prisma.household.findFirst).toHaveBeenCalledWith({
        where: { id: householdId, communityId, deletedAt: null },
        select: { id: true },
      });
      expect(standingQrs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            communityId,
            householdId,
            standing: 'BAD',
            expiresAt: expect.any(Date),
          }),
          select: {
            token: true,
            standing: true,
            expiresAt: true,
            createdAt: true,
          },
        }),
      );

      const token = result.token;
      expect(token).toMatch(/^[0-9a-f]{36}$/);
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
        before + 24 * 60 * 60 * 1000,
      );
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
        after + 24 * 60 * 60 * 1000,
      );
      expect(result.householdId).toBe(householdId);
    });

    it('throws NotFound when the household does not exist in the community', async () => {
      prisma.household.findFirst.mockResolvedValue(null);

      await expect(service.generate(communityId, householdId)).rejects.toThrow(
        NotFoundException,
      );
      expect(standingQrs.create).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    const now = Date.now();
    const validQr = {
      id: 'qr-1',
      token: 'a'.repeat(36),
      standing: 'BAD',
      expiresAt: new Date(now + 60_000),
      household: {
        id: householdId,
        block: '1',
        lot: 'A',
        unit: null,
        address: null,
        residents: [
          {
            firstName: 'Juan',
            middleName: null,
            lastName: 'Dela Cruz',
            suffix: null,
          },
        ],
      },
    };

    it('marks the pass verified and returns current standing with household info', async () => {
      prisma.assessment.findMany.mockResolvedValue([]);
      prisma.payment.findMany.mockResolvedValue([]);
      standingQrs.findFirst.mockResolvedValue(validQr);
      standingQrs.update.mockResolvedValue({ id: 'qr-1' });

      const result = await service.verify(
        'community-1',
        validQr.token,
        'user-1',
      );

      expect(standingQrs.update).toHaveBeenCalledWith({
        where: { id: 'qr-1' },
        data: {
          verifiedAt: expect.any(Date),
          verifiedById: 'user-1',
        },
      });

      expect(result.standing).toBe('GOOD');
      expect(result.issuedStanding).toBe('BAD');
      expect(result.household).toMatchObject({
        id: householdId,
        block: '1',
        lot: 'A',
        residents: [{ fullName: 'Juan Dela Cruz' }],
      });
    });

    it('throws NotFound for an unknown token', async () => {
      standingQrs.findFirst.mockResolvedValue(null);

      await expect(
        service.verify('community-1', 'b'.repeat(36), 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(standingQrs.update).not.toHaveBeenCalled();
    });

    it('throws NotFound for an expired pass', async () => {
      const expiredQr = {
        ...validQr,
        expiresAt: new Date(now - 60_000),
      };
      standingQrs.findFirst.mockResolvedValue(expiredQr);

      await expect(
        service.verify('community-1', validQr.token, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(standingQrs.update).not.toHaveBeenCalled();
    });
  });
});

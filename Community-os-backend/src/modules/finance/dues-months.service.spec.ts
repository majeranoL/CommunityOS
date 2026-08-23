import { BadRequestException } from '@nestjs/common';
import { AssessmentStatus } from '@prisma/client';

import { DuesMonthsService } from './dues-months.service';

describe('DuesMonthsService', () => {
  const duesChargeType = {
    id: 'ct-dues',
    name: 'Monthly Dues',
    amount: { toNumber: () => 250 },
    dueDay: 5,
  };

  let prismaMock: any;
  let financeSyncMock: any;
  let service: DuesMonthsService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      chargeType: {
        findFirst: jest.fn().mockResolvedValue(duesChargeType),
        create: jest.fn(),
      },
      billingPeriod: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'bp-1' }),
      },
      household: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'hh-1' }, { id: 'hh-2' }, { id: 'hh-3' }]),
      },
      assessment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ id: `ass-${data.householdId}`, ...data }),
          ),
      },
    };

    financeSyncMock = {
      sweepOverdue: jest.fn().mockResolvedValue(undefined),
      syncPeriod: jest.fn().mockResolvedValue(undefined),
    };

    service = new DuesMonthsService(prismaMock, financeSyncMock);
  });

  it('creates one assessment per active household for the month', async () => {
    const result = await service.createMonth('community-1', {
      month: '2026-08',
    });

    expect(result.data.createdCount).toBe(3);
    expect(result.data.skippedCount).toBe(0);
    expect(prismaMock.assessment.create).toHaveBeenCalledTimes(3);
    expect(prismaMock.assessment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        householdId: 'hh-1',
        period: '2026-08',
        billingPeriodId: 'bp-1',
        status: AssessmentStatus.ISSUED,
      }),
    });
    expect(financeSyncMock.syncPeriod).toHaveBeenCalledWith(
      'community-1',
      'bp-1',
    );
  });

  it('is idempotent: skips households already billed for the period', async () => {
    prismaMock.assessment.findMany.mockResolvedValue([
      { householdId: 'hh-1' },
      { householdId: 'hh-3' },
    ]);

    const result = await service.createMonth('community-1', {
      month: '2026-08',
    });

    expect(result.data.createdCount).toBe(1);
    expect(result.data.skippedCount).toBe(2);
  });

  it('prefers an explicit amount override over the charge type default', async () => {
    await service.createMonth('community-1', { month: '2026-08', amount: 300 });

    expect(prismaMock.billingPeriod.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 300 }),
      }),
    );
    expect(prismaMock.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amount: 300 }),
      }),
    );
  });

  it('rejects invalid month formats', async () => {
    await expect(
      service.createMonth('community-1', { month: 'August' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('syncs only missing households when re-running a filled month', async () => {
    const existingPeriod = {
      id: 'bp-existing',
      amount: { toNumber: () => 250 },
      dueDate: new Date('2026-08-05T00:00:00Z'),
    };
    // both the sync lookup and ensureBillingPeriod find the same period
    prismaMock.billingPeriod.findFirst.mockResolvedValue(existingPeriod);
    prismaMock.assessment.findMany.mockResolvedValue([
      { householdId: 'hh-1' },
      { householdId: 'hh-2' },
    ]);

    const result = await service.syncHouseholds('community-1', '2026-08');

    expect(result.data.createdCount).toBe(1);
    expect(result.data.skippedCount).toBe(2);
    // no new billing period created — it already exists
    expect(prismaMock.billingPeriod.create).not.toHaveBeenCalled();
  });

  it('returns zero counts when syncing before the month exists', async () => {
    prismaMock.chargeType.findFirst.mockResolvedValue(duesChargeType);
    prismaMock.billingPeriod.findFirst.mockResolvedValue(null);

    const result = await service.syncHouseholds('community-1', '2026-08');

    expect(result.data.createdCount).toBe(0);
    expect(prismaMock.assessment.create).not.toHaveBeenCalled();
  });
});

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  NotificationType,
  StickerStatus,
} from '@prisma/client';

import { VehicleStickersService } from './vehicle-stickers.service';

const OWNER = {
  id: 'user-owner-1',
  resident: { id: 'res-owner-1' },
};

const OFFICER = {
  id: 'user-officer-1',
  resident: { id: 'res-owner-1' },
};

function defaultVehicle() {
  return {
    id: 'veh-1',
    communityId: 'community-1',
    plateNumber: 'ABC-123',
    residentId: 'res-owner-1',
    resident: {
      id: 'res-owner-1',
      householdId: 'h1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    },
  };
}

function stickerFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stk-1',
    communityId: 'community-1',
    vehicleId: 'veh-1',
    status: StickerStatus.PENDING,
    stickerNumber: null,
    issueDate: null,
    expirationDate: null,
    notes: null,
    photoUrl: null,
    createdById: OWNER.id,
    vehicle: {
      id: 'veh-1',
      plateNumber: 'ABC-123',
      residentId: 'res-owner-1',
      resident: {
        id: 'res-owner-1',
        householdId: 'h1',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    },
    ...overrides,
  };
}

function makeTx(overrides: Record<string, unknown> = {}) {
  const updated = {
    id: 'stk-1',
    assessmentId: 'ass-1',
    stickerNumber: `STK-${new Date().getFullYear()}-001`,
    status: StickerStatus.ACTIVE,
    assessment: {
      id: 'ass-1',
      assessmentNumber: 'ASS-000001',
      amount: 250,
      status: AssessmentStatus.ISSUED,
    },
    ...((overrides.updated as object) ?? {}),
  };

  const tx = {
    chargeType: {
      findFirst: jest.fn().mockResolvedValue(overrides.chargeType ?? null),
      create: jest.fn().mockResolvedValue({ id: 'ct-1' }),
    },
    assessment: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.latestAssessment ?? null),
      create: jest.fn().mockResolvedValue({
        id: 'ass-1',
        assessmentNumber: 'ASS-000001',
        amount: 250,
        status: AssessmentStatus.ISSUED,
      }),
    },
    vehicleSticker: {
      findMany: jest.fn().mockResolvedValue(overrides.stickerNumbers ?? []),
      update: jest.fn().mockResolvedValue(updated),
    },
    vehicle: { update: jest.fn().mockResolvedValue({ id: 'veh-1' }) },
  };

  return { tx, updated };
}

function makeService(overrides: Record<string, unknown> = {}) {
  const vehicleStickerLookup = overrides.stickerForVerify ?? null;
  const { tx, updated } = makeTx(overrides);

  const prisma = {
    vehicle: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.vehicle ?? defaultVehicle()),
    },
    chargeType: {
      findFirst: jest.fn().mockResolvedValue(overrides.chargeType ?? null),
    },
    vehicleSticker: {
      findFirst: jest.fn().mockResolvedValue(vehicleStickerLookup),
      create: jest.fn().mockResolvedValue(stickerFixture()),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockResolvedValue(stickerFixture({ status: StickerStatus.REVOKED })),
    },
    $transaction: jest.fn((cb: any) => cb(tx)),
  };

  const featuresService = {
    assertEnabled: jest.fn().mockResolvedValue(null),
  };

  const notificationsService = {
    userIdsWithPermission: jest
      .fn()
      .mockResolvedValue(overrides.officers ?? ['user-officer-1']),
    notifyMany: jest.fn().mockResolvedValue(null),
    notify: jest.fn().mockResolvedValue(null),
  };

  const service = new VehicleStickersService(
    prisma as any,
    featuresService as any,
    notificationsService as any,
  );

  return { service, prisma, tx, updated, notificationsService };
}

describe('VehicleStickersService.options', () => {
  it('returns the charge type amount as price with 365-day validity', async () => {
    const { service } = makeService({
      chargeType: { id: 'ct-1', amount: { toNumber: () => 250 } },
    });

    const result = await service.options('community-1');

    expect(result.data).toEqual({ price: 250, validityDays: 365 });
  });

  it('returns price 0 when no charge type is configured', async () => {
    const { service, prisma } = makeService();
    prisma.chargeType.findFirst.mockResolvedValue(null);

    const result = await service.options('community-1');

    expect(result.data).toEqual({ price: 0, validityDays: 365 });
  });
});

describe('VehicleStickersService.request', () => {
  const dto = { vehicleId: 'veh-1', notes: 'Please expedite.' };

  it('creates a PENDING sticker and notifies officers with the verify permission', async () => {
    const { service, prisma, notificationsService } = makeService({
      officers: ['user-officer-1', 'user-officer-2'],
    });
    prisma.vehicleSticker.findFirst.mockResolvedValue(null);
    prisma.vehicleSticker.create.mockResolvedValue(stickerFixture());

    const result = await service.request('community-1', OWNER, dto);

    expect(result.success).toBe(true);
    expect(prisma.vehicleSticker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          vehicleId: 'veh-1',
          status: StickerStatus.PENDING,
          notes: 'Please expedite.',
          createdById: OWNER.id,
        }),
      }),
    );

    expect(notificationsService.userIdsWithPermission).toHaveBeenCalledWith(
      'community-1',
      'sticker.verify',
    );
    expect(notificationsService.notifyMany).toHaveBeenCalledWith(
      'community-1',
      expect.arrayContaining(['user-officer-1', 'user-officer-2']),
      NotificationType.VEHICLE_STICKER,
      'New sticker request',
      expect.stringContaining('ABC-123'),
      '/stickers/stk-1',
    );
  });

  it('throws NotFoundException when the vehicle does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(
      service.request('community-1', OWNER, dto),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.vehicleSticker.create).not.toHaveBeenCalled();
  });

  it('forbids requesting a sticker for a vehicle that is not theirs', async () => {
    const { service, prisma } = makeService({
      vehicle: {
        ...defaultVehicle(),
        residentId: 'res-other',
        resident: { id: 'res-other' },
      },
    });

    await expect(
      service.request('community-1', OWNER, dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.vehicleSticker.create).not.toHaveBeenCalled();
  });

  it('rejects a second request while one is already pending', async () => {
    const { service, prisma } = makeService();
    prisma.vehicleSticker.findFirst.mockResolvedValue(
      stickerFixture({ status: StickerStatus.PENDING }),
    );

    await expect(
      service.request('community-1', OWNER, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.vehicleSticker.create).not.toHaveBeenCalled();
  });

  it('rejects a request when the vehicle already has an active sticker', async () => {
    const { service, prisma } = makeService();
    prisma.vehicleSticker.findFirst.mockResolvedValue(
      stickerFixture({ status: StickerStatus.ACTIVE }),
    );

    await expect(service.request('community-1', OWNER, dto)).rejects.toThrow(
      'already has an active sticker',
    );
    expect(prisma.vehicleSticker.create).not.toHaveBeenCalled();
  });
});

describe('VehicleStickersService.verify (approve)', () => {
  it('approves a PENDING sticker, assigns a number, bills the household, and syncs the vehicle', async () => {
    const { service, tx, updated, notificationsService } = makeService({
      stickerForVerify: stickerFixture(),
      chargeType: { id: 'ct-1', amount: { toNumber: () => 250 } },
      latestAssessment: { assessmentNumber: 'ASS-000042' },
    });

    const result = await service.verify('community-1', OFFICER, 'stk-1', {
      approved: true,
      remarks: 'Looks good.',
    });

    expect(result.success).toBe(true);
    expect(updated.status).toBe(StickerStatus.ACTIVE);

    const updateCall = tx.vehicleSticker.update;
    expect(updateCall).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stickerNumber: `STK-${new Date().getFullYear()}-001`,
          status: StickerStatus.ACTIVE,
          verifiedById: OFFICER.id,
          verificationRemarks: 'Looks good.',
          assessmentId: 'ass-1',
        }),
      }),
    );

    expect(tx.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          householdId: 'h1',
          chargeTypeId: 'ct-1',
          assessmentNumber: 'ASS-000043',
          title: 'Vehicle Sticker / Gate Pass Fee — ABC-123',
          status: AssessmentStatus.ISSUED,
        }),
      }),
    );

    expect(tx.vehicle.update).toHaveBeenCalledWith({
      where: { id: 'veh-1' },
      data: { hasSticker: true, parkingStickerNumber: updated.stickerNumber },
    });

    expect(notificationsService.notify).toHaveBeenCalledWith(
      'community-1',
      OWNER.id,
      NotificationType.VEHICLE_STICKER,
      'Sticker approved',
      expect.stringContaining('ABC-123'),
      '/stickers/stk-1',
    );
  });

  it('does not bill the household when the owner has no household', async () => {
    const { service, tx } = makeService({
      stickerForVerify: stickerFixture({
        vehicle: {
          id: 'veh-1',
          plateNumber: 'ABC-123',
          residentId: 'res-owner-1',
          resident: { id: 'res-owner-1', householdId: null },
        },
      }),
      chargeType: { id: 'ct-1', amount: { toNumber: () => 250 } },
      updated: { assessmentId: null, assessment: null },
    });

    const result = await service.verify('community-1', OFFICER, 'stk-1', {
      approved: true,
    });

    expect(result.data.assessmentId).toBeNull();
    expect(tx.assessment.create).not.toHaveBeenCalled();
    expect(tx.vehicleSticker.update).toHaveBeenCalled();
  });

  it('does not bill the household when the charge type amount is zero', async () => {
    const { service, tx } = makeService({
      stickerForVerify: stickerFixture(),
      chargeType: { id: 'ct-1', amount: { toNumber: () => 0 } },
      updated: { assessmentId: null, assessment: null },
    });

    const result = await service.verify('community-1', OFFICER, 'stk-1', {
      approved: true,
    });

    expect(result.data.assessmentId).toBeNull();
    expect(tx.assessment.create).not.toHaveBeenCalled();
  });

  it('generates a sequential sticker number after existing stickers', async () => {
    const year = new Date().getFullYear();
    const { service } = makeService({
      stickerForVerify: stickerFixture(),
      chargeType: { id: 'ct-1', amount: { toNumber: () => 250 } },
      stickerNumbers: [
        { stickerNumber: `STK-${year}-004` },
        { stickerNumber: `STK-${year}-002` },
      ],
      updated: { stickerNumber: `STK-${year}-005` },
    });

    const result = await service.verify('community-1', OFFICER, 'stk-1', {
      approved: true,
    });

    expect(result.data.stickerNumber).toBe(`STK-${year}-005`);
  });
});

describe('VehicleStickersService.verify (reject and guards)', () => {
  it('rejects a PENDING sticker without billing and notifies the resident', async () => {
    const { service, prisma, tx, notificationsService } = makeService({
      stickerForVerify: stickerFixture(),
    });
    prisma.vehicleSticker.update.mockResolvedValue(
      stickerFixture({ status: StickerStatus.REVOKED }),
    );

    const result = await service.verify('community-1', OFFICER, 'stk-1', {
      approved: false,
      remarks: 'Duplicate plate.',
    });

    expect(result.data.status).toBe(StickerStatus.REVOKED);
    expect(prisma.vehicleSticker.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StickerStatus.REVOKED,
          verifiedById: OFFICER.id,
          verificationRemarks: 'Duplicate plate.',
        }),
      }),
    );
    expect(tx.assessment.create).not.toHaveBeenCalled();
    expect(tx.vehicle.update).not.toHaveBeenCalled();
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'community-1',
      OWNER.id,
      NotificationType.VEHICLE_STICKER,
      'Sticker rejected',
      expect.stringContaining('Duplicate plate.'),
      '/stickers/stk-1',
    );
  });

  it('throws NotFoundException for a missing sticker', async () => {
    const { service, prisma } = makeService();
    prisma.vehicleSticker.findFirst.mockResolvedValue(null);

    await expect(
      service.verify('community-1', OFFICER, 'missing', { approved: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to verify a sticker that is not pending', async () => {
    const { service, prisma } = makeService();
    prisma.vehicleSticker.findFirst.mockResolvedValue(
      stickerFixture({ status: StickerStatus.ACTIVE }),
    );

    await expect(
      service.verify('community-1', OFFICER, 'stk-1', { approved: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

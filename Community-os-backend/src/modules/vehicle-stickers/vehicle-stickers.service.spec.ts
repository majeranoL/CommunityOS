import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import {
  AssessmentStatus,
  NotificationType,
  StickerRequestStatus,
  StickerStatus,
} from '@prisma/client';

import { VehicleStickersService } from './vehicle-stickers.service';

const OWNER = {
  id: 'user-owner-1',
  resident: { id: 'res-owner-1' },
  roles: [],
};

function officerUser() {
  return {
    id: 'user-officer-1',
    resident: { id: 'res-owner-1' },
    roles: [
      {
        role: {
          permissions: [{ permission: { code: 'sticker.verify' } }],
        },
      },
    ],
  };
}

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

function requestFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    communityId: 'community-1',
    vehicleId: 'veh-1',
    requestNumber: 'SR-000001',
    quantity: 1,
    feeTotal: { toNumber: () => 250 },
    status: StickerRequestStatus.PENDING,
    notes: 'Please expedite.',
    assessmentId: null,
    requestedById: OWNER.id,
    approvedById: null,
    approvedAt: null,
    reviewRemarks: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicle: {
      id: 'veh-1',
      plateNumber: 'ABC-123',
      make: null,
      model: null,
      color: null,
      residentId: 'res-owner-1',
      resident: {
        id: 'res-owner-1',
        householdId: 'h1',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    },
    requestedBy: { id: OWNER.id, firstName: 'Ada', lastName: 'Lovelace' },
    approvedBy: { id: null, firstName: null, lastName: null },
    assessment: null,
    stickers: [],
    ...overrides,
  };
}

function makeTx(overrides: Record<string, unknown> = {}) {
  const tx = {
    sequence: {
      upsert: jest.fn().mockResolvedValue({ id: 'seq-1' }),
    },
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce(overrides.nextSequence ?? [{ next_value: 1n }])
      .mockResolvedValue(undefined),
    chargeType: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.chargeType ?? {
          id: 'ct-1',
          amount: { toNumber: () => 250 },
        },
      ),
      create: jest.fn().mockResolvedValue({ id: 'ct-1' }),
    },
    assessment: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.latestAssessment ?? null),
      create: jest.fn().mockResolvedValue({
        id: 'ass-1',
        assessmentNumber: 'ASS-000001',
        amount: { toNumber: () => 250 },
        status: AssessmentStatus.ISSUED,
        dueDate: new Date(),
      }),
    },
    vehicleSticker: {
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'vstk-1',
          stickerNumber: data.stickerNumber,
          issueDate: data.issueDate,
          expirationDate: data.expirationDate,
          status: data.status,
        }),
      ),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'vstk-1' }),
    },
    vehicle: { update: jest.fn().mockResolvedValue({ id: 'veh-1' }) },
    stickerRequest: {
      create: jest
        .fn()
        .mockResolvedValue(
          overrides.createdRequest ??
            requestFixture({ requestNumber: 'SR-000001' }),
        ),
      update: jest.fn().mockResolvedValue(
        overrides.updatedRequest ??
          requestFixture({
            status: StickerRequestStatus.APPROVED,
            approvedById: officerUser().id,
            approvedAt: new Date(),
            reviewRemarks: 'OK',
            assessment: {
              id: 'ass-1',
              assessmentNumber: 'ASS-000001',
              amount: { toNumber: () => 250 },
              status: AssessmentStatus.ISSUED,
              dueDate: new Date(),
            },
            stickers: [
              {
                id: 'vstk-1',
                stickerNumber: 'STK-000001',
                status: StickerStatus.ACTIVE,
                issueDate: new Date(),
                expirationDate: new Date(),
              },
            ],
          }),
      ),
    },
  };

  return { tx };
}

function makeService(overrides: Record<string, unknown> = {}) {
  const { tx } = makeTx(overrides);

  const prisma: Record<string, any> = {
    vehicle: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.vehicle ?? defaultVehicle()),
    },
    chargeType: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.chargeType ?? {
          id: 'ct-1',
          amount: { toNumber: () => 250 },
        },
      ),
    },
    setting: {
      findMany: jest.fn().mockResolvedValue(overrides.settings ?? []),
      upsert: jest.fn().mockResolvedValue({ id: 'setting-1' }),
    },
    vehicleSticker: {
      findFirst: jest.fn().mockResolvedValue(overrides.activeSticker ?? null),
      create: jest.fn().mockResolvedValue({
        id: 'vstk-1',
        stickerNumber: 'STK-000001',
        status: StickerStatus.ACTIVE,
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ id: 'vstk-1' }),
    },
    stickerRequest: {
      findFirst: jest
        .fn()
        .mockResolvedValue(overrides.requestForVerify ?? null),
      findMany: jest.fn().mockResolvedValue([requestFixture()]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(requestFixture()),
      update: jest.fn().mockResolvedValue(requestFixture()),
    },
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(tx),
    ),
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
    dispatchToHousehold: jest.fn().mockResolvedValue(null),
  };

  const service = new VehicleStickersService(
    prisma as any,
    featuresService as any,
    notificationsService as any,
  );

  return { service, prisma, tx, notificationsService };
}

describe('VehicleStickersService.options', () => {
  it('returns the charge type amount as price with 365-day validity', async () => {
    const { service } = makeService({
      chargeType: { id: 'ct-1', amount: { toNumber: () => 250 } },
    });

    const result = await service.options('community-1');

    expect(result.data).toEqual(
      expect.objectContaining({ price: 250, validityDays: 365 }),
    );
  });

  it('returns price 0 when no charge type is configured', async () => {
    const { service, prisma } = makeService();
    (prisma as any).chargeType.findFirst.mockResolvedValue(null);

    const result = await service.options('community-1');

    expect(result.data).toEqual(
      expect.objectContaining({ price: 0, validityDays: 365 }),
    );
  });

  it('reflects quantity rules and annual cycle settings', async () => {
    const { service } = makeService({
      chargeType: { id: 'ct-1', amount: { toNumber: () => 250 } },
      settings: [
        { key: 'stickerMaxQuantity', value: 2 },
        { key: 'stickerCycleEnabled', value: true },
        { key: 'stickerCycleStart', value: '01-01' },
        { key: 'stickerCycleEnd', value: '12-31' },
      ],
    });

    const result = await service.options('community-1');

    expect(result.data.maxQuantity).toBe(2);
    expect(result.data.quantityEnabled).toBe(true);
    expect(result.data.cycle.enabled).toBe(true);
    expect(result.data.cycle.start).toBe('01-01');
    expect(result.data.cycle.activeExpiration).toContain('-12-31');
  });
});

describe('VehicleStickersService.request', () => {
  const dto = { vehicleId: 'veh-1', notes: 'Please expedite.' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a PENDING sticker request with a sequence number and notifies officers', async () => {
    const { service, prisma, tx, notificationsService } = makeService({
      officers: ['user-officer-1', 'user-officer-2'],
    });
    (prisma as any).stickerRequest.findFirst.mockResolvedValue(null);
    (prisma as any).vehicleSticker.findFirst.mockResolvedValue(null);

    const result = await service.request('community-1', OWNER, dto);

    expect(result.success).toBe(true);
    expect(tx.sequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          key: 'sticker-request',
          prefix: 'SR',
        }),
      }),
    );
    expect(tx.stickerRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          communityId: 'community-1',
          vehicleId: 'veh-1',
          requestNumber: 'SR-000001',
          quantity: 1,
          notes: 'Please expedite.',
          requestedById: OWNER.id,
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
      '/stickers/req-1',
    );
  });

  it('bills quantity × unit price as the request fee', async () => {
    const { service, prisma, tx } = makeService();
    (prisma as any).stickerRequest.findFirst.mockResolvedValue(null);
    (prisma as any).vehicleSticker.findFirst.mockResolvedValue(null);
    (prisma as any).setting.findMany.mockResolvedValue([
      { key: 'stickerMaxQuantity', value: 5 },
    ]);

    await service.request('community-1', OWNER, {
      vehicleId: 'veh-1',
      quantity: 3,
    });

    const feeTotal = tx.stickerRequest.create.mock.calls[0][0].data.feeTotal;
    expect(Number(feeTotal.toString())).toBe(750);
    expect(tx.stickerRequest.create.mock.calls[0][0].data.quantity).toBe(3);
  });

  it('throws NotFoundException when the vehicle does not exist', async () => {
    const { service, prisma } = makeService();
    (prisma as any).vehicle.findFirst.mockResolvedValue(null);

    await expect(
      service.request('community-1', OWNER, dto),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids requesting a sticker for a vehicle that is not theirs', async () => {
    const { service } = makeService({
      vehicle: {
        ...defaultVehicle(),
        residentId: 'res-other',
        resident: { id: 'res-other' },
      },
    });

    await expect(
      service.request('community-1', OWNER, dto),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a second request while one is already pending', async () => {
    const { service, prisma } = makeService();
    (prisma as any).stickerRequest.findFirst.mockResolvedValue(
      requestFixture({ status: StickerRequestStatus.PENDING }),
    );

    await expect(
      service.request('community-1', OWNER, dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a request when the vehicle already has an active sticker', async () => {
    const { service, prisma } = makeService();
    (prisma as any).stickerRequest.findFirst.mockResolvedValue(null);
    (prisma as any).vehicleSticker.findFirst.mockResolvedValue({
      id: 'vstk-1',
      status: StickerStatus.ACTIVE,
    });

    await expect(service.request('community-1', OWNER, dto)).rejects.toThrow(
      'already has an active sticker',
    );
  });

  it('disallows multiple quantities when the community limits to one', async () => {
    const { service, prisma } = makeService();
    (prisma as any).stickerRequest.findFirst.mockResolvedValue(null);
    (prisma as any).vehicleSticker.findFirst.mockResolvedValue(null);
    (prisma as any).setting.findMany.mockResolvedValue([
      { key: 'stickerMaxQuantity', value: 1 },
    ]);

    await expect(
      service.request('community-1', OWNER, {
        vehicleId: 'veh-1',
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('VehicleStickersService.requestVerify (approve)', () => {
  it('approves a PENDING request, issues numbered stickers, bills the household, and syncs the vehicle', async () => {
    const { service, tx, notificationsService } = makeService({
      requestForVerify: requestFixture(),
      latestAssessment: { assessmentNumber: 'ASS-000042' },
    });

    const result = await service.requestVerify(
      'community-1',
      officerUser(),
      'req-1',
      { approved: true, remarks: 'OK' },
    );

    expect(result.success).toBe(true);

    const stickerCreateCall = tx.vehicleSticker.create.mock.calls[0][0];
    expect(stickerCreateCall.data.stickerNumber).toBe('STK-000001');
    expect(stickerCreateCall.data.requestId).toBe('req-1');
    expect(stickerCreateCall.data.status).toBe(StickerStatus.ACTIVE);
    expect(stickerCreateCall.data.verifiedById).toBe('user-officer-1');

    expect(tx.assessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          householdId: 'h1',
          assessmentNumber: 'ASS-000043',
          title: 'Vehicle Sticker / Gate Pass Fee — ABC-123',
          status: AssessmentStatus.ISSUED,
        }),
      }),
    );

    expect(tx.vehicle.update).toHaveBeenCalledWith({
      where: { id: 'veh-1' },
      data: { hasSticker: true, parkingStickerNumber: 'STK-000001' },
    });

    expect(tx.stickerRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StickerRequestStatus.APPROVED,
          approvedById: 'user-officer-1',
          assessmentId: 'ass-1',
          reviewRemarks: 'OK',
        }),
      }),
    );

    expect(notificationsService.notify).toHaveBeenCalledWith(
      'community-1',
      OWNER.id,
      NotificationType.VEHICLE_STICKER,
      'Sticker request approved',
      expect.stringContaining('ABC-123'),
      '/stickers/req-1',
    );
    expect(notificationsService.dispatchToHousehold).toHaveBeenCalledWith(
      'community-1',
      'h1',
      NotificationType.ASSESSMENT,
      expect.stringContaining('Vehicle Sticker / Gate Pass Fee'),
      expect.stringContaining('ABC-123'),
      '/finance/my-dues',
      expect.anything(),
    );
  });

  it('issues one sticker per requested quantity', async () => {
    const { service, tx } = makeService({
      requestForVerify: requestFixture({
        quantity: 2,
        feeTotal: { toNumber: () => 500 },
      }),
      settings: [{ key: 'stickerMaxQuantity', value: 2 }],
      nextSequence: [{ next_value: 40n }],
    });

    const result = await service.requestVerify(
      'community-1',
      officerUser(),
      'req-1',
      { approved: true },
    );

    expect(tx.vehicleSticker.create).toHaveBeenCalledTimes(2);
    expect(tx.vehicleSticker.create.mock.calls[0][0].data.stickerNumber).toBe(
      'STK-000040',
    );
    expect(tx.vehicleSticker.create.mock.calls[1][0].data.stickerNumber).toBe(
      'STK-000041',
    );

    const assessmentData = tx.assessment.create.mock.calls[0][0].data;
    expect(Number(assessmentData.amount.toString())).toBe(500);
    expect(assessmentData.title).toContain('(×2)');
    expect(result.success).toBe(true);
  });

  it('does not bill the household when the owner has no household', async () => {
    const { service, tx, notificationsService } = makeService({
      requestForVerify: requestFixture({
        vehicle: {
          id: 'veh-1',
          plateNumber: 'ABC-123',
          residentId: 'res-owner-1',
          resident: { id: 'res-owner-1', householdId: null },
        },
      }),
      updatedRequest: requestFixture({
        status: StickerRequestStatus.APPROVED,
        assessment: null,
        stickers: [],
      }),
    });

    const result = await service.requestVerify(
      'community-1',
      officerUser(),
      'req-1',
      { approved: true },
    );

    expect(result.data.assessment).toBeNull();
    expect(tx.assessment.create).not.toHaveBeenCalled();
    expect(notificationsService.dispatchToHousehold).not.toHaveBeenCalled();
  });
});

describe('VehicleStickersService.requestVerify (reject and guards)', () => {
  it('rejects a PENDING request without billing and notifies the resident', async () => {
    const { service, prisma, tx, notificationsService } = makeService({
      requestForVerify: requestFixture(),
    });
    prisma.stickerRequest.update.mockResolvedValue(
      requestFixture({
        status: StickerRequestStatus.REJECTED,
        approvedById: officerUser().id,
        reviewRemarks: 'Duplicate plate.',
      }),
    );

    const result = await service.requestVerify(
      'community-1',
      officerUser(),
      'req-1',
      { approved: false, remarks: 'Duplicate plate.' },
    );

    expect(result.data.status).toBe(StickerRequestStatus.REJECTED);
    expect(prisma.stickerRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StickerRequestStatus.REJECTED,
          approvedById: 'user-officer-1',
          reviewRemarks: 'Duplicate plate.',
        }),
      }),
    );
    expect(tx.assessment.create).not.toHaveBeenCalled();
    expect(tx.vehicle.update).not.toHaveBeenCalled();
    expect(notificationsService.notify).toHaveBeenCalledWith(
      'community-1',
      OWNER.id,
      NotificationType.VEHICLE_STICKER,
      'Sticker request rejected',
      expect.stringContaining('Duplicate plate.'),
      '/stickers/req-1',
    );
  });

  it('throws NotFoundException for a missing request', async () => {
    const { service } = makeService();

    await expect(
      service.requestVerify('community-1', officerUser(), 'missing', {
        approved: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to verify a request that is not pending', async () => {
    const { service } = makeService({
      requestForVerify: requestFixture({
        status: StickerRequestStatus.APPROVED,
      }),
    });

    await expect(
      service.requestVerify('community-1', officerUser(), 'req-1', {
        approved: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('VehicleStickersService.requestDelete', () => {
  it('cancels a pending request as soft delete', async () => {
    const { service, tx, prisma } = makeService({
      requestForVerify: requestFixture(),
    });
    prisma.stickerRequest.update.mockResolvedValue(null);

    const result = await service.requestDelete('community-1', OWNER, 'req-1');

    expect(result.success).toBe(true);
    expect(tx.stickerRequest.update).not.toHaveBeenCalled();
    expect(prisma.stickerRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      }),
    );
  });

  it('refuses to cancel an approved request', async () => {
    const { service } = makeService({
      requestForVerify: requestFixture({
        status: StickerRequestStatus.APPROVED,
      }),
    });

    await expect(
      service.requestDelete('community-1', OWNER, 'req-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('VehicleStickersService.requests', () => {
  it('scopes residents to their own vehicles', async () => {
    const { service, prisma } = makeService();

    await service.requests('community-1', OWNER, {});

    expect(prisma.stickerRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          communityId: 'community-1',
          vehicle: { residentId: 'res-owner-1' },
        }),
      }),
    );
    expect(prisma.stickerRequest.count).toHaveBeenCalled();
  });

  it('returns all requests with pagination for officers', async () => {
    const { service, prisma } = makeService();

    const result = await service.requests('community-1', officerUser(), {
      page: 2,
      limit: 5,
      status: StickerRequestStatus.PENDING,
    });

    const whereArg = prisma.stickerRequest.findMany.mock.calls[0][0].where;
    expect(whereArg.vehicle).toBeUndefined();
    expect(whereArg.status).toBe(StickerRequestStatus.PENDING);
    expect(result.pagination).toEqual(
      expect.objectContaining({ page: 2, limit: 5, total: 1 }),
    );
  });

  it('supports vehicle and search filters', async () => {
    const { service, prisma } = makeService();

    await service.requests('community-1', officerUser(), {
      vehicleId: 'veh-2',
      search: 'ABC',
    });

    const whereArg = prisma.stickerRequest.findMany.mock.calls[0][0].where;
    expect(whereArg.vehicleId).toBe('veh-2');
    expect(whereArg.OR).toHaveLength(2);
  });
});

describe('VehicleStickersService.create (officer direct issue)', () => {
  it('forbids residents from issuing stickers directly', async () => {
    const { service } = makeService();

    await expect(
      service.create('community-1', OWNER, { vehicleId: 'veh-1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('generates sequential sticker numbers for officers', async () => {
    const { service } = makeService({
      settings: [{ key: 'stickerMaxQuantity', value: 4 }],
    });

    const result = await service.create('community-1', officerUser(), {
      vehicleId: 'veh-1',
      quantity: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data.stickers).toHaveLength(2);
    expect(result.data.stickers[0].stickerNumber).toBe('STK-000001');
    expect(result.data.stickers[1].stickerNumber).toBe('STK-000002');
  });
});

describe('VehicleStickersService.updateSettings', () => {
  it('upserts the provided setting rows and returns the merged settings', async () => {
    const { service, prisma } = makeService();

    const result = await service.updateSettings('community-1', officerUser(), {
      cycleEnabled: true,
      cycleStart: '01-01',
      cycleEnd: '12-31',
      maxQuantity: 3,
    });

    expect(prisma.setting.upsert).toHaveBeenCalledTimes(4);
    expect(prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          communityId_key: {
            communityId: 'community-1',
            key: 'stickerCycleEnabled',
          },
        },
        create: expect.objectContaining({
          key: 'stickerCycleEnabled',
          value: true,
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data.maxQuantity).toBe(1);
  });
});

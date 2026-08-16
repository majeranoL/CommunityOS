import { ConflictException, ForbiddenException } from '@nestjs/common';

import { FacilityStatus } from '@prisma/client';

import { ReservationsService } from './reservations.service';

function makeService(overrides: {
  config?: Record<string, unknown>;
  standing?: { standing: 'GOOD' | 'BAD' } | null;
  facilityStatus?: FacilityStatus;
}) {
  const prisma = {
    facility: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'fac-1',
        status: overrides.facilityStatus ?? FacilityStatus.AVAILABLE,
      }),
    },
    resident: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'res-1',
        householdId: 'h1',
      }),
    },
    reservation: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'rv-1',
        facility: { id: 'fac-1', name: 'Clubhouse' },
        resident: { id: 'res-1', firstName: 'Ada', lastName: 'Lovelace' },
      }),
    },
  };

  const notificationsService = {
    userIdsWithPermission: jest.fn().mockResolvedValue([]),
    notifyMany: jest.fn(),
    notify: jest.fn(),
  };

  const featuresService = {
    getConfig: jest.fn().mockResolvedValue(overrides.config ?? {}),
  };

  const householdsService = {
    getHouseholdStanding: jest
      .fn()
      .mockResolvedValue(overrides.standing ?? { standing: 'GOOD' }),
  };

  const service = new ReservationsService(
    prisma as any,
    notificationsService as any,
    featuresService as any,
    householdsService as any,
  );

  return { service, prisma, householdsService };
}

describe('ReservationsService.create standing enforcement', () => {
  const dto = {
    facilityId: 'fac-1',
    residentId: 'res-1',
    startAt: '2026-09-01T10:00:00.000Z',
    endAt: '2026-09-01T12:00:00.000Z',
  };

  it('allows creation when the feature is disabled', async () => {
    const { service, prisma } = makeService({ config: {} });

    const result = await service.create('community-1', dto);

    expect(result.success).toBe(true);
    expect(prisma.reservation.create).toHaveBeenCalled();
  });

  it('allows creation for GOOD standing households', async () => {
    const { service, prisma } = makeService({
      config: { restrictedServices: ['facility_reservations'] },
      standing: { standing: 'GOOD' },
    });

    const result = await service.create('community-1', dto);

    expect(result.success).toBe(true);
    expect(prisma.reservation.create).toHaveBeenCalled();
  });

  it('allows creation when facility reservations are not restricted', async () => {
    const { service, prisma } = makeService({
      config: { restrictedServices: [] },
      standing: { standing: 'BAD' },
    });

    const result = await service.create('community-1', dto);

    expect(result.success).toBe(true);
    expect(prisma.reservation.create).toHaveBeenCalled();
  });

  it('blocks BAD standing households when facility reservations are restricted', async () => {
    const { service, prisma, householdsService } = makeService({
      config: { restrictedServices: ['facility_reservations'] },
      standing: { standing: 'BAD' },
    });

    await expect(service.create('community-1', dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(householdsService.getHouseholdStanding).toHaveBeenCalledWith(
      'community-1',
      'h1',
    );
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });

  it('does not check standing for residents without a household', async () => {
    const prisma = {
      facility: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'fac-1',
          status: FacilityStatus.AVAILABLE,
        }),
      },
      resident: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'res-1', householdId: null }),
      },
      reservation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'rv-1',
          facility: { id: 'fac-1', name: 'Clubhouse' },
          resident: { id: 'res-1' },
        }),
      },
    };

    const householdsService = { getHouseholdStanding: jest.fn() };
    const service = new ReservationsService(
      prisma as any,
      {
        userIdsWithPermission: jest.fn().mockResolvedValue([]),
        notifyMany: jest.fn(),
      } as any,
      {
        getConfig: jest
          .fn()
          .mockResolvedValue({ restrictedServices: ['facility_reservations'] }),
      } as any,
      householdsService as any,
    );

    const result = await service.create('community-1', dto);

    expect(result.success).toBe(true);
    expect(householdsService.getHouseholdStanding).not.toHaveBeenCalled();
    expect(prisma.reservation.create).toHaveBeenCalled();
  });

  it('allows creation when the household has a null standing summary', async () => {
    const { service, prisma } = makeService({
      config: { restrictedServices: ['facility_reservations'] },
      standing: null,
    });

    const result = await service.create('community-1', dto);

    expect(result.success).toBe(true);
    expect(prisma.reservation.create).toHaveBeenCalled();
  });

  it('blocks creation when the facility is under maintenance', async () => {
    const { service, prisma } = makeService({
      facilityStatus: FacilityStatus.MAINTENANCE,
    });

    await expect(service.create('community-1', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });
});

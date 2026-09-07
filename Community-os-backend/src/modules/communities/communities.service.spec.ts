import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';

import { FeaturesService } from '../features/features.service';

import { CommunitiesService } from './communities.service';
import { ProvisionCommunityDto } from './dto/provision-community.dto';

jest.mock('bcrypt');

const communityId = 'community-id';
const accountId = 'account-id';
const userId = 'user-id';
const residentId = 'resident-id';
const householdId = 'household-id';

const baseDto: ProvisionCommunityDto = {
  displayName: 'Maple HOA',
  address: '123 Maple Street, City, Province',
  email: 'admin@maplehoa.test',
  owner: {
    firstName: 'Grace',
    lastName: 'Lee',
    email: 'admin@maplehoa.test',
    password: 'Str0ng!Pass',
  },
};

const buildTx = () => ({
  community: {
    create: jest.fn().mockResolvedValue({
      id: communityId,
      code: 'HOA-123456',
      slug: 'maple-hoa',
      displayName: 'Maple HOA',
      email: 'admin@maplehoa.test',
      status: 'ACTIVE',
      createdAt: new Date(),
    }),
  },
  role: {
    create: jest.fn().mockResolvedValue({ id: 'role-id' }),
  },
  permission: {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  rolePermission: {
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  account: {
    create: jest.fn().mockResolvedValue({ id: accountId }),
  },
  household: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: householdId }),
  },
  resident: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: residentId }),
  },
  user: {
    create: jest
      .fn()
      .mockResolvedValue({ id: userId, firstName: 'Grace', lastName: 'Lee' }),
  },
  userRole: {
    create: jest.fn().mockResolvedValue({ id: 'user-role-id' }),
  },
});

describe('CommunitiesService provision (Phase 5 Community Account)', () => {
  let service: CommunitiesService;
  let prisma: any;
  let tx: any;
  let features: { assignStandardFeaturesToCommunity: jest.Mock };

  beforeEach(async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    tx = buildTx();

    prisma = {
      account: { findUnique: jest.fn().mockResolvedValue(null) },
      subscriptionPlan: { findFirst: jest.fn().mockResolvedValue(null) },
      community: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        async (callback: (client: any) => Promise<unknown>) => callback(tx),
      ),
    };

    features = {
      assignStandardFeaturesToCommunity: jest.fn().mockResolvedValue({}),
    };

    const module = await Test.createTestingModule({
      providers: [
        CommunitiesService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeaturesService, useValue: features },
      ],
    }).compile();

    service = module.get<CommunitiesService>(CommunitiesService);
  });

  it('creates the account independently of Household/Resident on self-signup', async () => {
    const result = await service.provision(baseDto);

    expect(result.success).toBe(true);
    expect(tx.household.create).not.toHaveBeenCalled();
    expect(tx.resident.create).not.toHaveBeenCalled();

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          residentId: null,
          isCommunityAccount: true,
        }),
      }),
    );
  });

  it('does not link a Household/Resident even when unit info is provided on self-signup', async () => {
    await service.provision({
      ...baseDto,
      owner: {
        ...baseDto.owner,
        block: 'B1',
        lot: 'L1',
        unit: '7',
      },
    });

    expect(tx.household.create).not.toHaveBeenCalled();
    expect(tx.resident.create).not.toHaveBeenCalled();
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          residentId: null,
          isCommunityAccount: true,
        }),
      }),
    );
  });

  it('links Household/Resident only when explicitly provisioning (requireUnit)', async () => {
    const result = await service.provision(
      {
        ...baseDto,
        owner: {
          ...baseDto.owner,
          block: 'B1',
          lot: 'L1',
        },
      },
      true,
    );

    expect(result.success).toBe(true);
    expect(tx.household.create).toHaveBeenCalled();
    expect(tx.resident.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          householdId,
          communityId,
        }),
      }),
    );
    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          residentId,
          isCommunityAccount: true,
        }),
      }),
    );
  });

  it('rejects explicit provisioning when unit info is missing', async () => {
    prisma.$transaction = jest.fn();

    await expect(service.provision(baseDto, true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a duplicate owner email', async () => {
    prisma.account.findUnique.mockResolvedValue({ id: 'existing-account' });

    await expect(service.provision(baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

import { createHash } from 'crypto';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import {
  AccountStatus,
  CommunityStatus,
  HouseholdStatus,
} from '@prisma/client';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../../mail/mail.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const buildTx = (overrides: Record<string, unknown> = {}) => ({
  household: {
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({ id: 'household-id' }),
  },
  account: {
    create: jest.fn().mockResolvedValue({ id: 'account-id' }),
  },
  resident: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'resident-id' }),
  },
  user: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'user-id' }),
  },
  userRole: {
    create: jest.fn().mockResolvedValue({}),
  },
  ...overrides,
});

const fullAccount = {
  id: 'account-id',
  email: 'ana@example.com',
  status: AccountStatus.ACTIVE,
  user: {
    id: 'user-id',
    referenceNumber: 'USR-000001',
    firstName: 'Ana',
    middleName: null,
    lastName: 'Doe',
    phoneNumber: null,
    avatarUrl: null,
    isPlatformAdmin: false,
    community: {
      id: 'community-id',
      code: 'C1',
      slug: 'c1',
      displayName: 'Test Community',
    },
    resident: {
      id: 'resident-id',
      residentNumber: 'RES-000001',
      household: {
        id: 'household-id',
        block: 'B1',
        lot: 'L1',
        unit: null,
        address: null,
      },
    },
    roles: [{ role: { name: 'Member', permissions: [] } }],
  },
};

const baseDto: RegisterDto = {
  email: 'ANA@example.com',
  password: 'Str0ng!Pass',
  firstName: 'ana',
  lastName: 'doe',
  communityId: 'community-id',
  block: 'B1',
  lot: 'L1',
  otpCode: '123456',
};

describe('AuthService register gate', () => {
  let service: AuthService;
  let prisma: any;
  let tx: any;
  let jwt: { signAsync: jest.Mock };

  beforeEach(async () => {
    const otpCode = '123456';
    const otpHash = createHash('sha256').update(otpCode).digest('hex');

    prisma = {
      account: { findUnique: jest.fn() },
      community: { findFirst: jest.fn() },
      setting: { findUnique: jest.fn() },
      role: { findFirst: jest.fn() },
      user: { count: jest.fn() },
      refreshToken: { create: jest.fn() },
      session: { create: jest.fn() },
      otpVerification: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'otp-id',
          code: otpHash,
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(),
    };

    prisma.account.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fullAccount);
    prisma.community.findFirst.mockResolvedValue({
      id: 'community-id',
      status: CommunityStatus.ACTIVE,
    });
    prisma.setting.findUnique.mockResolvedValue(null);
    prisma.role.findFirst.mockResolvedValue({ id: 'role-id' });
    prisma.user.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(tx);
      }
      return Promise.resolve([]);
    });

    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: JwtService, useValue: jwt },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tx = buildTx();
  });

  it('blocks registration when registrationMode is CLOSED', async () => {
    prisma.setting.findUnique.mockResolvedValue({ value: 'CLOSED' });

    await expect(service.register(baseDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows registration when the setting is absent (defaults to OPEN)', async () => {
    prisma.setting.findUnique.mockResolvedValue(null);

    const result = await service.register(baseDto);

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('allows registration when registrationMode is OPEN explicitly', async () => {
    prisma.setting.findUnique.mockResolvedValue({ value: 'OPEN' });

    const result = await service.register(baseDto);

    expect(result.success).toBe(true);
    expect(result.message).toContain('submitted for approval');
  });

  it('rejects registration when an active household already has an owner', async () => {
    tx = buildTx({
      household: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'household-id',
          status: HouseholdStatus.ACTIVE,
        }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'household-id' }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'owner-id' }),
        create: jest.fn().mockResolvedValue({ id: 'user-id' }),
      },
      account: {
        create: jest.fn().mockResolvedValue({ id: 'account-id' }),
      },
      resident: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'resident-id' }),
      },
      userRole: {
        create: jest.fn().mockResolvedValue({}),
      },
    });

    await expect(service.register(baseDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('reactivates an INACTIVE household instead of creating a new one', async () => {
    const householdUpdate = jest.fn().mockResolvedValue({});

    tx = buildTx({
      household: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'household-id',
          status: HouseholdStatus.INACTIVE,
        }),
        update: householdUpdate,
        create: jest.fn().mockResolvedValue({ id: 'household-id' }),
      },
    });

    const result = await service.register(baseDto);

    expect(result.success).toBe(true);
    expect(householdUpdate).toHaveBeenCalledWith({
      where: { id: 'household-id' },
      data: {
        status: HouseholdStatus.ACTIVE,
        deletedAt: null,
      },
    });
  });

  it('normalizes the email to lowercase', async () => {
    const result = await service.register(baseDto);

    expect(prisma.account.findUnique).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
    });
    expect(result.success).toBe(true);
  });
});

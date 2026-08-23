import { ConflictException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

import { UsersService } from './users.service';

describe('UsersService role assignment guards', () => {
  const presidentRole = {
    id: 'role-president',
    name: 'President',
    isSystem: true,
    communityId: 'community-1',
    deletedAt: null,
  };
  const memberRole = {
    id: 'role-member',
    name: 'Member',
    isSystem: true,
    communityId: 'community-1',
    deletedAt: null,
  };
  const treasurerRole = {
    id: 'role-treasurer',
    name: 'Treasurer',
    isSystem: false,
    communityId: 'community-1',
    deletedAt: null,
  };

  const lastPresidentUser = {
    id: 'user-1',
    accountId: 'account-1',
    communityId: 'community-1',
    status: UserStatus.ACTIVE,
    account: { id: 'account-1' },
    roles: [{ role: presidentRole }],
  };

  let prismaMock: any;
  let auditLogsMock: { log: jest.Mock };
  let service: UsersService;

  const buildUserRow = (overrides: Record<string, unknown> = {}) => ({
    ...lastPresidentUser,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      account: { update: jest.fn().mockResolvedValue({}) },
      role: { findFirst: jest.fn() },
      userRole: {
        findFirst: jest.fn(),
        count: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((work: (tx: unknown) => unknown) =>
        work(prismaMock),
      ),
    };

    auditLogsMock = { log: jest.fn().mockResolvedValue(undefined) };

    service = new UsersService(
      prismaMock,
      {} as any,
      {} as any,
      auditLogsMock as any,
    );

    // role.findFirst is used both to validate the target role (by id) and to
    // resolve the system President role (by name) — dispatch on `where`
    prismaMock.role.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.name === 'President'
          ? presidentRole
          : where.id === treasurerRole.id
            ? treasurerRole
            : where.id === memberRole.id
              ? memberRole
              : null,
      ),
    );
  });

  it('blocks demoting the last active President via role change', async () => {
    prismaMock.user.findFirst.mockResolvedValue(buildUserRow());
    prismaMock.userRole.findFirst.mockResolvedValue({
      userId: 'user-1',
      roleId: presidentRole.id,
    });
    prismaMock.userRole.count.mockResolvedValue(0);

    await expect(
      service.update('community-1', 'user-1', { roleId: memberRole.id }),
    ).rejects.toThrow(ConflictException);

    expect(prismaMock.user.update).not.toHaveBeenCalled();
    expect(prismaMock.userRole.create).not.toHaveBeenCalled();
  });

  it('allows demoting a President when another active President exists', async () => {
    prismaMock.user.findFirst.mockResolvedValue(buildUserRow());
    prismaMock.userRole.findFirst.mockResolvedValue({
      userId: 'user-1',
      roleId: presidentRole.id,
    });
    prismaMock.userRole.count.mockResolvedValue(1);

    const result = await service.update('community-1', 'user-1', {
      roleId: memberRole.id,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prismaMock.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', roleId: memberRole.id },
    });
  });

  it('logs USER_ROLE_CHANGED with before/after roles on success', async () => {
    prismaMock.user.findFirst.mockResolvedValue(buildUserRow());
    prismaMock.userRole.findFirst.mockResolvedValue(null);

    await service.update(
      'community-1',
      'user-1',
      { roleId: treasurerRole.id },
      'actor-9',
    );

    expect(auditLogsMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_ROLE_CHANGED',
        actorId: 'actor-9',
        entityId: 'user-1',
        before: { roles: ['President'] },
        after: { roles: ['Treasurer'] },
      }),
    );
  });

  it('blocks suspending the last active President', async () => {
    prismaMock.user.findFirst.mockResolvedValue(buildUserRow());
    prismaMock.userRole.findFirst.mockResolvedValue({
      userId: 'user-1',
      roleId: presidentRole.id,
    });
    prismaMock.userRole.count.mockResolvedValue(0);

    await expect(
      service.update('community-1', 'user-1', { status: UserStatus.SUSPENDED }),
    ).rejects.toThrow(ConflictException);
  });

  it('blocks deleting the last active President', async () => {
    prismaMock.user.findFirst.mockResolvedValue(buildUserRow());
    prismaMock.userRole.findFirst.mockResolvedValue({
      userId: 'user-1',
      roleId: presidentRole.id,
    });
    prismaMock.userRole.count.mockResolvedValue(0);

    await expect(service.remove('community-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
  });
});

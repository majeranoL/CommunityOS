import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import ms, { StringValue } from 'ms';

import {
  AccountStatus,
  SessionStatus,
  UserStatus,
  ResidentStatus,
  HouseholdStatus,
  CommunityStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { MailService } from '../../mail/mail.service';

import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';

type AccountWithUser = {
  id: string;
  email: string;
  status: AccountStatus;
  user: {
    id: string;
    referenceNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
    isPlatformAdmin: boolean;
    community: {
      id: string;
      code: string;
      slug: string;
      displayName: string;
    };
    resident: {
      id: string;
      residentNumber: string;
      household: {
        id: string;
        block: string | null;
        lot: string | null;
        unit: string | null;
        address: string | null;
      } | null;
    } | null;
    roles: {
      role: {
        name: string;
        permissions: {
          permission: {
            code: string;
          };
        }[];
      };
    }[];
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ==========================================
  // Helpers
  // ==========================================

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private formatUser(account: AccountWithUser) {
    if (!account.user) {
      throw new UnauthorizedException('Account has no user profile');
    }

    const user = account.user;

    return {
      id: user.id,
      referenceNumber: user.referenceNumber,

      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,

      email: account.email,

      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,

      isPlatformAdmin: user.isPlatformAdmin,

      community: {
        id: user.community.id,
        code: user.community.code,
        slug: user.community.slug,
        displayName: user.community.displayName,
      },

      resident: user.resident
        ? {
            id: user.resident.id,
            residentNumber: user.resident.residentNumber,

            household: user.resident.household
              ? {
                  id: user.resident.household.id,
                  block: user.resident.household.block,
                  lot: user.resident.household.lot,
                  unit: user.resident.household.unit,
                  address: user.resident.household.address,
                }
              : null,
          }
        : null,

      roles: user.roles.map((r) => r.role.name),

      permissions: [
        ...new Set(
          user.roles.flatMap((r) =>
            r.role.permissions.map((p) => p.permission.code),
          ),
        ),
      ],
    };
  }

  private async issueRefreshToken(
    accountId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const refreshExpiresInMs =
      ms((process.env.REFRESH_EXPIRES_IN as StringValue | undefined) ?? '7d') ??
      604800000;

    const token = await this.jwtService.signAsync(
      {
        sub: accountId,
        type: 'refresh',
        jti: randomUUID(),
      },
      {
        secret: process.env.REFRESH_SECRET!,
        expiresIn: refreshExpiresInMs / 1000,
      },
    );

    const expiresAt = new Date(Date.now() + refreshExpiresInMs);

    await this.prisma.$transaction([
      this.prisma.refreshToken.create({
        data: {
          accountId,
          token: this.hashToken(token),
          expiresAt,
        },
      }),
      this.prisma.session.create({
        data: {
          accountId,
          ipAddress,
          userAgent: userAgent ? userAgent.slice(0, 255) : undefined,
          status: SessionStatus.ACTIVE,
          expiresAt,
        },
      }),
    ]);

    return token;
  }

  private async createSession(
    account: AccountWithUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!account.user) {
      throw new UnauthorizedException('Account has no user profile');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: account.user.id,
      email: account.email,
      communityId: account.user.community.id,
    });

    const refreshToken = await this.issueRefreshToken(
      account.id,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken,
      user: this.formatUser(account),
    };
  }

  // ==========================================
  // Register
  // ==========================================

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.account.findUnique({
      where: {
        email,
      },
    });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    // ==========================================
    // Resolve Community
    // ==========================================

    const community = await this.prisma.community.findFirst({
      where: {
        id: dto.communityId,
        status: CommunityStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    // ==========================================
    // Registration Gate
    // ==========================================

    const registrationSetting = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId: community.id,
          key: 'registrationMode',
        },
      },
    });

    const registrationMode =
      (registrationSetting?.value as string | undefined) ?? 'OPEN';

    if (registrationMode === 'CLOSED') {
      throw new ForbiddenException(
        'Registration is closed for this community. Contact your administrator.',
      );
    }

    // ==========================================
    // Validate Unit Information
    // ==========================================

    const hasUnitInfo = Boolean(
      dto.block?.trim() ||
      dto.lot?.trim() ||
      dto.unit?.trim() ||
      dto.address?.trim(),
    );

    if (!hasUnitInfo) {
      throw new BadRequestException(
        'Please provide at least one of block, lot, unit, or address.',
      );
    }

    // ==========================================
    // Resolve Default Role
    // ==========================================

    const role =
      (await this.prisma.role.findFirst({
        where: {
          communityId: community.id,
          deletedAt: null,
          isSystem: true,
          name: 'Member',
        },
      })) ??
      (await this.prisma.role.findFirst({
        where: {
          communityId: community.id,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }));

    // ==========================================
    // Hash Password
    // ==========================================

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // ==========================================
    // Generate User Reference Number
    // ==========================================

    const totalUsers = await this.prisma.user.count({
      where: {
        communityId: community.id,
      },
    });

    const referenceNumber = `USR-${String(totalUsers + 1).padStart(6, '0')}`;

    const capitalize = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

    // ==========================================
    // Create Account + User + User Role
    // ==========================================

    const createdAccount = await this.prisma.$transaction(async (prisma) => {
      // ==========================================
      // Find or Create Household (ownership rule)
      // ==========================================

      let household: { id: string; status?: HouseholdStatus } | null = null;

      const block = dto.block?.trim();
      const lot = dto.lot?.trim();

      if (block && lot) {
        // Ownership rule: match by block + lot (incl. soft-deleted/INACTIVE so
        // the same household's financial history is reused on reactivation)
        household = await prisma.household.findFirst({
          where: {
            communityId: community.id,
            block,
            lot,
          },
          select: { id: true, status: true },
        });

        if (household) {
          if (household.status === HouseholdStatus.ACTIVE) {
            // Already occupied by an active account holder?
            const owner = await prisma.user.findFirst({
              where: {
                communityId: community.id,
                status: UserStatus.ACTIVE,
                deletedAt: null,
                resident: {
                  householdId: household.id,
                },
              },
              select: { id: true },
            });

            if (owner) {
              throw new ConflictException(
                'This unit already has an account. Contact your administrator.',
              );
            }
          } else {
            // INACTIVE: reactivate the same household and reuse its history
            await prisma.household.update({
              where: { id: household.id },
              data: {
                status: HouseholdStatus.ACTIVE,
                deletedAt: null,
              },
            });
          }
        }
      }

      // Fallback (address-only, no block+lot) or no match: match by any
      // provided unit fields, otherwise create a new household
      if (!household && (block || lot || dto.unit?.trim())) {
        household = await prisma.household.findFirst({
          where: {
            communityId: community.id,
            deletedAt: null,
            ...(block ? { block } : {}),
            ...(lot ? { lot } : {}),
            ...(dto.unit?.trim() ? { unit: dto.unit.trim() } : {}),
          },
          select: { id: true },
        });
      }

      if (!household) {
        household = await prisma.household.create({
          data: {
            communityId: community.id,
            block: block ?? null,
            lot: lot ?? null,
            unit: dto.unit?.trim() ?? null,
            address: dto.address?.trim() ?? null,
            status: HouseholdStatus.ACTIVE,
          },
          select: { id: true },
        });
      }

      // ==========================================
      // Create Account
      // ==========================================

      const account = await prisma.account.create({
        data: {
          email,
          passwordHash,
          status: AccountStatus.ACTIVE,
        },
      });

      // ==========================================
      // Create Resident
      // ==========================================

      const latestResident = await prisma.resident.findFirst({
        where: {
          communityId: community.id,
        },
        orderBy: {
          residentNumber: 'desc',
        },
        select: {
          residentNumber: true,
        },
      });

      let residentNumber = 'RES-000001';

      if (latestResident) {
        const latestNumber = Number(
          latestResident.residentNumber.replace('RES-', ''),
        );

        residentNumber = `RES-${String(latestNumber + 1).padStart(6, '0')}`;
      }

      const resident = await prisma.resident.create({
        data: {
          communityId: community.id,
          residentNumber,
          householdId: household.id,
          firstName: capitalize(dto.firstName),
          middleName: dto.middleName ? capitalize(dto.middleName) : null,
          lastName: capitalize(dto.lastName),
          phoneNumber: dto.phoneNumber?.trim(),
          email,
          status: ResidentStatus.ACTIVE,
        },
      });

      // ==========================================
      // Create User
      // ==========================================

      const user = await prisma.user.create({
        data: {
          accountId: account.id,
          communityId: community.id,
          residentId: resident.id,
          referenceNumber,
          firstName: capitalize(dto.firstName),
          middleName: dto.middleName ? capitalize(dto.middleName) : null,
          lastName: capitalize(dto.lastName),
          phoneNumber: dto.phoneNumber?.trim(),
          status: UserStatus.ACTIVE,
        },
      });

      if (role) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }

      return account;
    });

    const account = await this.prisma.account.findUnique({
      where: {
        id: createdAccount.id,
      },
      include: {
        user: {
          include: {
            community: true,
            resident: {
              include: {
                household: true,
              },
            },
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const session = await this.createSession(account!, ipAddress, userAgent);

    return {
      success: true,
      message: 'Registration successful.',
      data: session,
    };
  }

  // ==========================================
  // Login
  // ==========================================

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const account = await this.usersService.findByEmail(email);

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, account.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    if (!account.user) {
      throw new UnauthorizedException('Account has no user profile');
    }

    const session = await this.createSession(account, ipAddress, userAgent);

    await this.prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Login successful.',
      data: session,
    };
  }

  // ==========================================
  // Refresh
  // ==========================================

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.REFRESH_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const record = await this.prisma.refreshToken.findUnique({
      where: {
        token: this.hashToken(refreshToken),
      },
    });

    if (!record || record.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.sub !== record.accountId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: {
          id: record.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException('Refresh token expired');
    }

    const account = await this.prisma.account.findUnique({
      where: {
        id: record.accountId,
      },
      include: {
        user: {
          include: {
            community: true,
            resident: {
              include: {
                household: true,
              },
            },
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!account || account.status !== AccountStatus.ACTIVE || !account.user) {
      throw new UnauthorizedException('Account is not active');
    }

    // ==========================================
    // Rotate: revoke old refresh token, issue a new one
    // ==========================================

    await this.prisma.refreshToken.update({
      where: {
        id: record.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const session = await this.createSession(account, ipAddress, userAgent);

    return {
      success: true,
      message: 'Session refreshed successfully.',
      data: session,
    };
  }

  // ==========================================
  // Logout (revoke refresh token)
  // ==========================================

  async logout(accountId: string, refreshToken: string) {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: {
          token: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prisma.session.updateMany({
        where: {
          accountId,
          status: SessionStatus.ACTIVE,
        },
        data: {
          status: SessionStatus.REVOKED,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Logged out successfully.',
    };
  }

  // ==========================================
  // Forgot Password
  // ==========================================

  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();

    const account = await this.prisma.account.findUnique({
      where: { email: normalized },
      include: { user: true },
    });

    if (account && account.user) {
      const token = await this.jwtService.signAsync(
        {
          sub: account.id,
          type: 'password_reset',
        },
        {
          expiresIn: '30m',
        },
      );

      const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(
        /\/$/,
        '',
      );

      await this.mailService.sendPasswordResetEmail(
        account.email,
        `${account.user.firstName} ${account.user.lastName}`,
        `${appUrl}/reset-password?token=${encodeURIComponent(token)}`,
      );
    }

    return {
      success: true,
      message:
        'If an account exists for that email, a password reset link has been sent.',
    };
  }

  // ==========================================
  // Reset Password
  // ==========================================

  async resetPassword(token: string, password: string) {
    let payload: { sub: string; type?: string };

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    if (payload.type !== 'password_reset') {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
    });

    if (!account || account.deletedAt) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const passwordHash = await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_SALT_ROUNDS || 10),
    );

    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: account.id },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { accountId: account.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { accountId: account.id, status: SessionStatus.ACTIVE },
        data: { status: SessionStatus.REVOKED },
      }),
    ]);

    return {
      success: true,
      message: 'Password has been reset successfully. You can now sign in.',
    };
  }

  // ==========================================
  // Profile (for GET /auth/me)
  // ==========================================

  profile(user: {
    id: string;
    referenceNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
    status: UserStatus;
    isPlatformAdmin: boolean;
    account: {
      email: string;
    };
    community: {
      id: string;
      code: string;
      slug: string;
      displayName: string;
    };
    resident: {
      id: string;
      residentNumber: string;
      household: {
        id: string;
        block: string | null;
        lot: string | null;
        unit: string | null;
        address: string | null;
      } | null;
    } | null;
    roles: {
      role: {
        name: string;
        permissions: {
          permission: {
            code: string;
          };
        }[];
      };
    }[];
  }) {
    return {
      success: true,
      message: 'Profile retrieved successfully.',
      data: {
        id: user.id,
        referenceNumber: user.referenceNumber,

        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,

        email: user.account.email,

        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,

        isPlatformAdmin: user.isPlatformAdmin,

        status: user.status,

        community: {
          id: user.community.id,
          code: user.community.code,
          slug: user.community.slug,
          displayName: user.community.displayName,
        },

        resident: user.resident
          ? {
              id: user.resident.id,
              residentNumber: user.resident.residentNumber,

              household: user.resident.household
                ? {
                    id: user.resident.household.id,
                    block: user.resident.household.block,
                    lot: user.resident.household.lot,
                    unit: user.resident.household.unit,
                    address: user.resident.household.address,
                  }
                : null,
            }
          : null,

        roles: user.roles.map((r) => r.role.name),

        permissions: [
          ...new Set(
            user.roles.flatMap((r) =>
              r.role.permissions.map((p) => p.permission.code),
            ),
          ),
        ],
      },
    };
  }
}

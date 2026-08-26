import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
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
  OtpPurpose,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { MailService } from '../../mail/mail.service';

import { UsersService } from '../users/users.service';

import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';

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

  private static readonly OTP_TTL_MS = 10 * 60 * 1000;
  private static readonly OTP_MAX_ATTEMPTS = 5;
  private static readonly OTP_RESEND_COOLDOWN_MS = 60 * 1000;

  async sendRegistrationOtp(dto: SendOtpDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.account.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const latest = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        purpose: OtpPurpose.REGISTER,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    });

    if (latest) {
      const elapsedMs = Date.now() - latest.createdAt.getTime();

      if (elapsedMs < AuthService.OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil(
          (AuthService.OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000,
        );

        throw new HttpException(
          `Please wait ${waitSeconds}s before requesting a new code.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.prisma.otpVerification.updateMany({
      where: {
        email,
        purpose: OtpPurpose.REGISTER,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        consumedAt: new Date(),
      },
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + AuthService.OTP_TTL_MS);

    await this.prisma.otpVerification.create({
      data: {
        email,
        purpose: OtpPurpose.REGISTER,
        code: createHash('sha256').update(code).digest('hex'),
        expiresAt,
      },
    });

    const name = email.split('@')[0];

    await this.mailService.sendRegistrationOtpEmail(email, name, code, 10);

    const data: { devCode?: string; expiresInSeconds: number } = {
      expiresInSeconds: AuthService.OTP_TTL_MS / 1000,
    };

    if (!this.mailService.isConfigured) {
      data.devCode = code;

      return {
        success: true,
        message:
          'Email delivery is not configured. Use the code below to complete your registration.',
        data,
      };
    }

    return {
      success: true,
      message: 'A one-time verification code has been sent to your email.',
      data,
    };
  }

  private async verifyRegistrationOtp(email: string, code: string) {
    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        purpose: OtpPurpose.REGISTER,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'Verification code is invalid or has expired. Request a new one.',
      );
    }

    if (otpRecord.attempts >= AuthService.OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Too many verification attempts. Request a new code.',
      );
    }

    const codeMatches =
      otpRecord.code === createHash('sha256').update(code.trim()).digest('hex');

    if (!codeMatches) {
      await this.prisma.otpVerification.update({
        where: {
          id: otpRecord.id,
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      throw new BadRequestException('Incorrect verification code.');
    }

    await this.prisma.otpVerification.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  async register(dto: RegisterDto) {
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
    // Verify Registration OTP
    // ==========================================

    await this.verifyRegistrationOtp(email, dto.otpCode);

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

    await this.prisma.$transaction(async (prisma) => {
      // ==========================================
      // Find or Create Household (ownership rule)
      // ==========================================

      let household: { id: string; status?: HouseholdStatus } | null = null;

      const block = dto.block?.trim();
      const lot = dto.lot?.trim();

      if (block && lot) {
        household = await prisma.household.findFirst({
          where: {
            communityId: community.id,
            block,
            lot,
          },
          select: { id: true, status: true },
        });

        if (household?.status === HouseholdStatus.INACTIVE) {
          await prisma.household.update({
            where: { id: household.id },
            data: {
              status: HouseholdStatus.ACTIVE,
              deletedAt: null,
            },
          });
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
      // 1-account-per-household restriction
      // ==========================================

      const existingUser = await prisma.user.findFirst({
        where: {
          communityId: community.id,
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING] },
          deletedAt: null,
          resident: {
            householdId: household.id,
          },
        },
        select: { id: true },
      });

      if (existingUser) {
        throw new ConflictException(
          'This household already has a registered account. Only one account is allowed per household.',
        );
      }

      // ==========================================
      // Create Account
      // ==========================================

      const account = await prisma.account.create({
        data: {
          email,
          passwordHash,
          status: AccountStatus.PENDING,
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
          gender: dto.gender ?? null,
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
          status: UserStatus.PENDING,
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

    return {
      success: true,
      message:
        'Registration submitted for approval. You will be able to sign in once an administrator approves your account.',
    };
  }

  // ==========================================
  // Login
  // ==========================================

  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_MS = 15 * 60 * 1000;

  private async recordFailedAttempt(accountId: string) {
    const current = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { failedLoginAttempts: true },
    });

    const attempts = (current?.failedLoginAttempts ?? 0) + 1;

    const lockedUntil =
      attempts >= AuthService.MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + AuthService.LOCKOUT_MS)
        : null;

    await this.prisma.account.update({
      where: { id: accountId },
      data: { failedLoginAttempts: attempts, lockedUntil },
    });
  }

  private async clearFailedAttempts(accountId: string) {
    await this.prisma.account.update({
      where: { id: accountId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  private ensureActiveUser(user: { status: UserStatus } | null | undefined) {
    if (!user) {
      throw new UnauthorizedException('Account has no user profile');
    }

    if (user.status !== UserStatus.ACTIVE) {
      const message: Partial<Record<UserStatus, string>> = {
        [UserStatus.PENDING]: 'Your registration is pending approval.',
        [UserStatus.SUSPENDED]: 'Your account is suspended. Contact your HOA.',
        [UserStatus.INACTIVE]: 'Your account is inactive.',
        [UserStatus.REJECTED]:
          'Your registration was declined. Contact your HOA.',
      };

      throw new UnauthorizedException(
        message[user.status] ?? 'Account is not active',
      );
    }
  }

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

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is temporarily locked. Try again in a few minutes.',
      );
    }

    const isValid = await bcrypt.compare(password, account.passwordHash);

    if (!isValid) {
      await this.recordFailedAttempt(account.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.clearFailedAttempts(account.id);

    if (account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    if (!account.user) {
      throw new UnauthorizedException('Account has no user profile');
    }

    this.ensureActiveUser(account.user);

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

    if (!account || account.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    this.ensureActiveUser(account.user);

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
  // Change Password
  // ==========================================

  async changePassword(
    accountId: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken?: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { passwordHash: true },
    });

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    const currentIsValid = await bcrypt.compare(
      currentPassword,
      account.passwordHash,
    );

    if (!currentIsValid) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    const isSame = await bcrypt.compare(newPassword, account.passwordHash);

    if (isSame) {
      throw new BadRequestException(
        'New password must be different from the current one.',
      );
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );

    // Revoke every other refresh token so other devices are signed out,
    // while the current session stays logged in.
    await this.prisma.$transaction([
      this.prisma.account.update({
        where: { id: accountId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          accountId,
          revokedAt: null,
          ...(currentRefreshToken
            ? { token: { not: this.hashToken(currentRefreshToken) } }
            : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    return {
      success: true,
      message: 'Password changed successfully. Other sessions were signed out.',
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

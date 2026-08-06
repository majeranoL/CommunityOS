import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import ms, { StringValue } from 'ms';

import { AccountStatus, SessionStatus, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // Helpers
  // ==========================================

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private formatUser(account: {
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
      community: {
        id: string;
        code: string;
        slug: string;
        displayName: string;
      };
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
  }) {
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

      community: {
        id: user.community.id,
        code: user.community.code,
        slug: user.community.slug,
        displayName: user.community.displayName,
      },

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

    const user = account.user;

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: account.email,
      communityId: user.community.id,
    });

    const refreshToken = await this.issueRefreshToken(
      account.id,
      ipAddress,
      userAgent,
    );

    await this.prisma.account.update({
      where: {
        id: account.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.formatUser(account),
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

    const user = account.user;

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

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: account.email,
      communityId: user.community.id,
    });

    const newRefreshToken = await this.issueRefreshToken(
      account.id,
      ipAddress,
      userAgent,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.formatUser(account),
    };
  }

  // ==========================================
  // Logout (revoke refresh token)
  // ==========================================

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        token: this.hashToken(refreshToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Logged out successfully.',
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
    account: {
      email: string;
    };
    community: {
      id: string;
      code: string;
      slug: string;
      displayName: string;
    };
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

        status: user.status,

        community: {
          id: user.community.id,
          code: user.community.code,
          slug: user.community.slug,
          displayName: user.community.displayName,
        },

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

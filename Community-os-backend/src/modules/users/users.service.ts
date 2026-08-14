import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { JwtService } from '@nestjs/jwt';
import { MailService } from '../../mail/mail.service';

import { PrismaService } from '../../prisma/prisma.service';

import {
  AccountStatus,
  ResidentStatus,
  ResidentType,
  SessionStatus,
  UserStatus,
} from '@prisma/client';

import { CreateUserDto } from './dto/create-user.dto';
import { CreateRenterDto } from './dto/create-renter.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private capitalize(value?: string) {
    if (!value) return value;

    return value
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  // ==========================================
  // Authentication Helpers
  // ==========================================

  async findByEmail(email: string) {
    return this.prisma.account.findUnique({
      where: {
        email,
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
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        account: true,
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
    });
  }

  async create(communityId: string, dto: CreateUserDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.firstName = this.capitalize(dto.firstName)!;
    dto.middleName = this.capitalize(dto.middleName);
    dto.lastName = this.capitalize(dto.lastName)!;

    dto.email = dto.email.trim().toLowerCase();

    dto.phoneNumber = dto.phoneNumber?.trim();

    dto.avatarUrl = dto.avatarUrl?.trim();

    // ==========================================
    // Duplicate Email
    // ==========================================

    const existingAccount = await this.prisma.account.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingAccount) {
      throw new ConflictException('Email already exists.');
    }

    // ==========================================
    // Validate Role
    // ==========================================

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        communityId,
        deletedAt: null,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    // ==========================================
    // Resolve Resident / Household link
    // (every account must be linked so there are
    // no ghost accounts with no unit)
    // ==========================================

    if (dto.residentId && dto.householdId) {
      throw new BadRequestException(
        'Link the account to either an existing resident or a household, not both.',
      );
    }

    if (!dto.residentId && !dto.householdId) {
      throw new BadRequestException(
        'Link the account to a resident or a household.',
      );
    }

    let residentId: string | null = null;
    let householdId: string | null = null;
    let newResidentNumber: string | null = null;

    const names: {
      firstName: string;
      middleName: string | null;
      lastName: string;
    } = {
      firstName: dto.firstName,
      middleName: dto.middleName ?? null,
      lastName: dto.lastName,
    };

    if (dto.residentId) {
      const resident = await this.prisma.resident.findFirst({
        where: {
          id: dto.residentId,
          communityId,
          deletedAt: null,
        },
        include: {
          user: {
            select: { id: true },
          },
        },
      });

      if (!resident) {
        throw new NotFoundException('Resident not found.');
      }

      if (resident.user) {
        throw new ConflictException(
          'This resident is already linked to an account.',
        );
      }

      residentId = resident.id;

      // The resident registry is the source of truth — the account
      // takes the resident's name and contact details.
      names.firstName = resident.firstName;
      names.middleName = resident.middleName;
      names.lastName = resident.lastName;
      dto.phoneNumber =
        dto.phoneNumber?.trim() || resident.phoneNumber || undefined;
    } else {
      const household = await this.prisma.household.findFirst({
        where: {
          id: dto.householdId,
          communityId,
          deletedAt: null,
        },
      });

      if (!household) {
        throw new NotFoundException('Household not found.');
      }

      // 1-account-per-household: refuse to create a second holder
      // on a unit that already has one.
      const existingHolder = await this.prisma.user.findFirst({
        where: {
          status: { in: [UserStatus.ACTIVE, UserStatus.PENDING] },
          deletedAt: null,
          resident: {
            householdId: household.id,
          },
        },
        select: { id: true },
      });

      if (existingHolder) {
        throw new ConflictException(
          'This household already has an account holder. Link the new account to the existing resident, or use "Assign renter" to replace the holder.',
        );
      }

      householdId = household.id;

      const latestResident = await this.prisma.resident.findFirst({
        where: {
          communityId,
        },
        orderBy: {
          residentNumber: 'desc',
        },
        select: {
          residentNumber: true,
        },
      });

      newResidentNumber = 'RES-000001';

      if (latestResident) {
        const latestNumber = Number(
          latestResident.residentNumber.replace('RES-', ''),
        );

        newResidentNumber = `RES-${String(latestNumber + 1).padStart(6, '0')}`;
      }
    }

    // ==========================================
    // Hash Password
    // ==========================================

    const passwordHash = await bcrypt.hash(
      dto.password,
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );

    // ==========================================
    // Generate User Reference Number
    // ==========================================

    const latestUser = await this.prisma.user.findFirst({
      where: {
        communityId,
      },
      orderBy: {
        referenceNumber: 'desc',
      },
      select: {
        referenceNumber: true,
      },
    });

    let referenceNumber = 'USR-000001';

    if (latestUser) {
      const latestNumber = Number(
        latestUser.referenceNumber.replace('USR-', ''),
      );

      referenceNumber = `USR-${String(latestNumber + 1).padStart(6, '0')}`;
    }

    // ==========================================
    // Create Account + Resident (when linking a
    // household) + User + User Role
    // ==========================================

    const user = await this.prisma.$transaction(async (prisma) => {
      const account = await prisma.account.create({
        data: {
          email: dto.email,
          passwordHash,
          status: AccountStatus.ACTIVE,
        },
      });

      let createdResidentId: string | null = residentId;

      if (householdId && newResidentNumber) {
        const resident = await prisma.resident.create({
          data: {
            communityId,
            residentNumber: newResidentNumber,
            householdId,
            firstName: names.firstName,
            middleName: names.middleName,
            lastName: names.lastName,
            phoneNumber: dto.phoneNumber,
            email: dto.email,
            gender: dto.gender ?? null,
            status: ResidentStatus.ACTIVE,
          },
        });

        createdResidentId = resident.id;
      }

      const createdUser = await prisma.user.create({
        data: {
          accountId: account.id,
          communityId,

          residentId: createdResidentId,
          referenceNumber,

          firstName: names.firstName,
          middleName: names.middleName,
          lastName: names.lastName,

          phoneNumber: dto.phoneNumber,
          avatarUrl: dto.avatarUrl,

          status: UserStatus.ACTIVE,
        },
      });

      await prisma.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: dto.roleId,
        },
      });

      return createdUser;
    });

    return {
      success: true,
      message: 'User created successfully.',
      data: user,
    };
  }

  // ==========================================
  // Create Renter (limited tenant account)
  // ==========================================

  async createRenter(communityId: string, dto: CreateRenterDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    const firstName = this.capitalize(dto.firstName)!;
    const middleName = this.capitalize(dto.middleName);
    const lastName = this.capitalize(dto.lastName)!;

    const email = dto.email.trim().toLowerCase();

    const phoneNumber = dto.phoneNumber?.trim();

    // ==========================================
    // Duplicate Email
    // ==========================================

    const existingAccount = await this.prisma.account.findUnique({
      where: {
        email,
      },
    });

    if (existingAccount) {
      throw new ConflictException('Email already exists.');
    }

    // ==========================================
    // Validate Household
    // ==========================================

    const household = await this.prisma.household.findFirst({
      where: {
        id: dto.householdId,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    // ==========================================
    // Validate Renter Role
    // ==========================================

    const renterRole = await this.prisma.role.findFirst({
      where: {
        communityId,
        name: 'Renter',
        deletedAt: null,
      },
    });

    if (!renterRole) {
      throw new NotFoundException(
        'Renter role not found. Contact a platform administrator.',
      );
    }

    // ==========================================
    // Community policy: renter accounts allowed?
    // ==========================================

    const renterPolicy = await this.prisma.setting.findUnique({
      where: {
        communityId_key: {
          communityId,
          key: 'renterAccountsAllowed',
        },
      },
    });

    if (renterPolicy?.value === false) {
      throw new ForbiddenException(
        'This community does not allow renter accounts.',
      );
    }

    // ==========================================
    // Generate Reference Numbers
    // ==========================================

    const latestUser = await this.prisma.user.findFirst({
      where: {
        communityId,
      },
      orderBy: {
        referenceNumber: 'desc',
      },
      select: {
        referenceNumber: true,
      },
    });

    let referenceNumber = 'USR-000001';

    if (latestUser) {
      const latestNumber = Number(
        latestUser.referenceNumber.replace('USR-', ''),
      );

      referenceNumber = `USR-${String(latestNumber + 1).padStart(6, '0')}`;
    }

    const latestResident = await this.prisma.resident.findFirst({
      where: {
        communityId,
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

    // ==========================================
    // Temporary Password (never revealed)
    // ==========================================

    const tempPassword = crypto.randomBytes(16).toString('base64');

    const passwordHash = await bcrypt.hash(
      tempPassword,
      Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
    );

    // ==========================================
    // Transaction: deactivate current holder,
    // then create Account + Resident + User
    // ==========================================

    const user = await this.prisma.$transaction(async (prisma) => {
      const currentHolders = await prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          deletedAt: null,
          resident: {
            householdId: dto.householdId,
          },
        },
        select: {
          id: true,
          accountId: true,
        },
      });

      for (const holder of currentHolders) {
        await prisma.account.update({
          where: {
            id: holder.accountId,
          },
          data: {
            status: AccountStatus.DISABLED,
          },
        });

        await prisma.user.update({
          where: {
            id: holder.id,
          },
          data: {
            status: UserStatus.INACTIVE,
          },
        });

        await prisma.session.updateMany({
          where: {
            accountId: holder.accountId,
            status: SessionStatus.ACTIVE,
          },
          data: {
            status: SessionStatus.REVOKED,
          },
        });

        await prisma.refreshToken.updateMany({
          where: {
            accountId: holder.accountId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });
      }

      const account = await prisma.account.create({
        data: {
          email,
          passwordHash,
          status: AccountStatus.ACTIVE,
        },
      });

      const resident = await prisma.resident.create({
        data: {
          communityId,
          residentNumber,
          householdId: dto.householdId,
          firstName,
          middleName,
          lastName,
          phoneNumber,
          email,
          gender: dto.gender ?? null,
          status: ResidentStatus.ACTIVE,
          residentType: ResidentType.RENTER,
        },
      });

      const createdUser = await prisma.user.create({
        data: {
          accountId: account.id,
          communityId,
          residentId: resident.id,
          referenceNumber,
          firstName,
          middleName,
          lastName,
          phoneNumber,
          status: UserStatus.ACTIVE,
        },
      });

      await prisma.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: renterRole.id,
        },
      });

      return createdUser;
    });

    // ==========================================
    // Send set-password email
    // ==========================================

    const token = await this.jwtService.signAsync(
      {
        sub: user.accountId,
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

    await this.mailService.sendAccountCreatedEmail(
      email,
      `${firstName} ${lastName}`,
      `${appUrl}/reset-password?token=${encodeURIComponent(token)}`,
    );

    return {
      success: true,
      message:
        'Renter account created. They will receive an email to set their password.',
      data: user,
    };
  }

  // ==========================================
  // Get All Users
  // ==========================================

  async findAll(communityId: string, query: UserQueryDto) {
    const { page, limit, search, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    // Search
    if (search) {
      where.OR = [
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          referenceNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          account: {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Status Filter
    if (status) {
      where.status = status;
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          account: {
            select: {
              email: true,
            },
          },

          resident: {
            select: {
              household: {
                select: {
                  id: true,
                  block: true,
                  lot: true,
                  unit: true,
                  address: true,
                  status: true,
                },
              },
            },
          },

          roles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),

      this.prisma.user.count({
        where,
      }),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user.id,
      accountId: user.accountId,
      communityId: user.communityId,

      referenceNumber: user.referenceNumber,

      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,

      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,

      email: user.account.email,

      status: user.status,

      household: user.resident?.household
        ? {
            id: user.resident.household.id,
            block: user.resident.household.block,
            lot: user.resident.household.lot,
            unit: user.resident.household.unit,
            address: user.resident.household.address,
            status: user.resident.household.status,
          }
        : null,

      roles: user.roles.map((r) => ({
        id: r.role.id,
        name: r.role.name,
      })),

      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      success: true,
      data: formattedUsers,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  // ==========================================
  // Get User By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      include: {
        account: {
          select: {
            email: true,
          },
        },

        roles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      success: true,
      message: 'User retrieved successfully.',
      data: {
        id: user.id,
        accountId: user.accountId,
        communityId: user.communityId,

        referenceNumber: user.referenceNumber,

        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,

        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,

        email: user.account.email,

        status: user.status,

        roles: user.roles.map((r) => ({
          id: r.role.id,
          name: r.role.name,
        })),

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  private async revokeUserSessions(accountId: string) {
    await this.prisma.$transaction([
      this.prisma.session.updateMany({
        where: {
          accountId,
          status: SessionStatus.ACTIVE,
        },
        data: {
          status: SessionStatus.REVOKED,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          accountId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);
  }

  async update(communityId: string, id: string, dto: UpdateUserDto) {
    // ==========================================
    // Check if User Exists
    // ==========================================

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
      include: {
        account: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.firstName) {
      dto.firstName = this.capitalize(dto.firstName)!;
    }

    if (dto.middleName !== undefined) {
      dto.middleName = this.capitalize(dto.middleName);
    }

    if (dto.lastName) {
      dto.lastName = this.capitalize(dto.lastName)!;
    }

    if (dto.email) {
      dto.email = dto.email.trim().toLowerCase();

      const existingAccount = await this.prisma.account.findFirst({
        where: {
          email: dto.email,
          NOT: {
            id: user.accountId,
          },
        },
      });

      if (existingAccount) {
        throw new ConflictException('Email already exists.');
      }
    }

    // ==========================================
    // Validate Role
    // ==========================================

    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({
        where: {
          id: dto.roleId,
          communityId,
          deletedAt: null,
        },
      });

      if (!role) {
        throw new NotFoundException('Role not found.');
      }
    }

    // ==========================================
    // Update
    // ==========================================

    await this.prisma.$transaction(async (prisma) => {
      await prisma.account.update({
        where: {
          id: user.accountId,
        },
        data: {
          ...(dto.email && {
            email: dto.email,
          }),
        },
      });

      await prisma.user.update({
        where: {
          id,
        },
        data: {
          ...(dto.firstName && {
            firstName: dto.firstName,
          }),

          ...(dto.middleName !== undefined && {
            middleName: dto.middleName,
          }),

          ...(dto.lastName && {
            lastName: dto.lastName,
          }),

          ...(dto.phoneNumber !== undefined && {
            phoneNumber: dto.phoneNumber,
          }),

          ...(dto.avatarUrl !== undefined && {
            avatarUrl: dto.avatarUrl,
          }),

          ...(dto.status && {
            status: dto.status,
          }),
        },
      });

      if (dto.roleId) {
        await prisma.userRole.deleteMany({
          where: {
            userId: id,
          },
        });

        await prisma.userRole.create({
          data: {
            userId: id,
            roleId: dto.roleId,
          },
        });
      }
    });

    if (dto.status === UserStatus.ACTIVE) {
      await this.prisma.account.update({
        where: {
          id: user.accountId,
        },
        data: {
          status: AccountStatus.ACTIVE,
          emailVerifiedAt: user.account?.emailVerifiedAt ?? new Date(),
        },
      });
    }

    if (dto.status && dto.status !== UserStatus.ACTIVE) {
      await this.revokeUserSessions(user.accountId);
    }

    return {
      success: true,
      message: 'User updated successfully.',
    };
  }

  async remove(communityId: string, id: string) {
    // ==========================================
    // Check if User Exists
    // ==========================================

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
      include: {
        account: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // ==========================================
    // Soft Delete
    // ==========================================

    await this.prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          status: UserStatus.INACTIVE,
        },
      });

      await prisma.account.update({
        where: {
          id: user.accountId,
        },
        data: {
          status: AccountStatus.DISABLED,
        },
      });
    });

    await this.revokeUserSessions(user.accountId);

    return {
      success: true,
      message: 'User deleted successfully.',
    };
  }
}

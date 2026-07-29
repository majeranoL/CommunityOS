import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';

import {
  AccountStatus,
  UserStatus,
} from '@prisma/client';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private capitalize(value?: string) {
    if (!value) return value;

    return value
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (char) =>
        char.toUpperCase(),
      );
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
      },
      include: {
        account: true,
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
    });
  }

  async create(
    communityId: string,
    dto: CreateUserDto,
  ) {
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

    const existingAccount =
      await this.prisma.account.findUnique({
        where: {
          email: dto.email,
        },
      });

    if (existingAccount) {
      throw new ConflictException(
        'Email already exists.',
      );
    }

    // ==========================================
    // Validate Role
    // ==========================================

    const role =
      await this.prisma.role.findFirst({
        where: {
          id: dto.roleId,
          communityId,
          deletedAt: null,
        },
      });

    if (!role) {
      throw new NotFoundException(
        'Role not found.',
      );
    }

    
  // ==========================================
  // Hash Password
  // ==========================================

  const passwordHash = await bcrypt.hash(
    dto.password,
    10,
  );

  // ==========================================
  // Generate User Reference Number
  // ==========================================

  const totalUsers =
    await this.prisma.user.count({
      where: {
        communityId,
      },
    });

  const referenceNumber = `USR-${String(
    totalUsers + 1,
  ).padStart(6, '0')}`;


  // ==========================================
  // Create Account + User + User Role
  // ==========================================

  const user =
    await this.prisma.$transaction(
      async (prisma) => {

        const account =
          await prisma.account.create({
            data: {
              email: dto.email,
              passwordHash,
              status: AccountStatus.ACTIVE,
            },
          });

        const createdUser =
          await prisma.user.create({
            data: {
              accountId: account.id,
              communityId,

              referenceNumber,

              firstName: dto.firstName,
              middleName: dto.middleName,
              lastName: dto.lastName,

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
      },
    );

    return {
  success: true,
  message: 'User created successfully.',
  data: user,
  };
  
  }


  // ==========================================
  // Temporary Stubs
  // ==========================================

  // ==========================================
  // Get All Users
  // ==========================================

  async findAll(
    communityId: string,
    query: UserQueryDto,
  ) {
    const {
      page,
      limit,
      search,
      status,
      sortBy,
      order,
    } = query;

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

    const [users, total] =
      await this.prisma.$transaction([
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

  async findOne(
    communityId: string,
    id: string,
  ) {
    return {};
  }

  async update(
    communityId: string,
    id: string,
    dto: UpdateUserDto,
  ) {
    return {};
  }

  async remove(
    communityId: string,
    id: string,
  ) {
    return {};
  }
}
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

  // ==========================================
  // Get User By ID
  // ==========================================

  async findOne(
    communityId: string,
    id: string,
  ) {
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
      throw new NotFoundException(
        'User not found.',
      );
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

  async update(
    communityId: string,
    id: string,
    dto: UpdateUserDto,
  ) {
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
      throw new NotFoundException(
        'User not found.',
      );
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

      const existingAccount =
        await this.prisma.account.findFirst({
          where: {
            email: dto.email,
            NOT: {
              id: user.accountId,
            },
          },
        });

      if (existingAccount) {
        throw new ConflictException(
          'Email already exists.',
        );
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
        throw new NotFoundException(
          'Role not found.',
        );
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

    return {
      success: true,
      message: 'User updated successfully.',
    };
  }


  async remove(
    communityId: string,
    id: string,
  ) {
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
      throw new NotFoundException(
        'User not found.',
      );
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

    return {
      success: true,
      message: 'User deleted successfully.',
    };
  }
  
}
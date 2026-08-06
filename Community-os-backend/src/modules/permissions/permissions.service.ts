import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

import { PermissionQueryDto } from './dto/permission-query.dto';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Get All Permissions
  // ==========================================

  async findAll(communityId: string, query: PermissionQueryDto) {
    const { page, limit, search, module, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
    };

    // Search
    if (search) {
      where.OR = [
        {
          code: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Module Filter
    if (module) {
      where.module = module;
    }

    const [permissions, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          code: true,
          module: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      this.prisma.permission.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Permissions retrieved successfully.',
      data: permissions,

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
  // Get Permission Modules
  // ==========================================

  async findModules(communityId: string) {
    const modules = await this.prisma.permission.findMany({
      where: {
        communityId,
      },

      distinct: ['module'],

      select: {
        module: true,
      },

      orderBy: {
        module: 'asc',
      },
    });

    return {
      success: true,
      message: 'Permission modules retrieved successfully.',
      data: modules.map((item) => item.module),
    };
  }

  // ==========================================
  // Get Permission By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const permission = await this.prisma.permission.findFirst({
      where: {
        id,
        communityId,
      },

      select: {
        id: true,
        code: true,
        module: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!permission) {
      throw new NotFoundException('Permission not found.');
    }

    return {
      success: true,
      message: 'Permission retrieved successfully.',
      data: permission,
    };
  }
}

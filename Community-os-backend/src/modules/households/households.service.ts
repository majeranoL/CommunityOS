import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { HouseholdStatus, UserStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { HouseholdQueryDto } from './dto/household-query.dto';

@Injectable()
export class HouseholdsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Deactivate Linked Account (User status)
  // ==========================================

  private async deactivateLinkedAccounts(householdId: string) {
    const linkedUsers = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
        resident: {
          householdId,
        },
      },
      select: { id: true },
    });

    if (linkedUsers.length === 0) return;

    await this.prisma.user.updateMany({
      where: {
        id: { in: linkedUsers.map((user) => user.id) },
      },
      data: {
        status: UserStatus.INACTIVE,
      },
    });
  }

  // ==========================================
  // Create Household
  // ==========================================

  async create(communityId: string, dto: CreateHouseholdDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.block = dto.block?.trim();
    dto.lot = dto.lot?.trim();
    dto.unit = dto.unit?.trim();
    dto.address = dto.address?.trim();

    // ==========================================
    // Duplicate Block/Lot
    // ==========================================

    if (dto.block && dto.lot) {
      const existing = await this.prisma.household.findFirst({
        where: {
          communityId,
          block: dto.block,
          lot: dto.lot,
          deletedAt: null,
        },
      });

      if (existing) {
        throw new ConflictException('Household already exists.');
      }
    }

    // ==========================================
    // Create Household
    // ==========================================

    const household = await this.prisma.household.create({
      data: {
        communityId,

        block: dto.block,
        lot: dto.lot,
        unit: dto.unit,
        address: dto.address,

        status: dto.status ?? HouseholdStatus.ACTIVE,
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Household created successfully.',
      data: household,
    };
  }

  // ==========================================
  // Get All Households
  // ==========================================

  async findAll(communityId: string, query: HouseholdQueryDto) {
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
          block: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lot: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          unit: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          address: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [households, total] = await this.prisma.$transaction([
      this.prisma.household.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        select: {
          id: true,
          block: true,
          lot: true,
          unit: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              residents: true,
            },
          },
        },
      }),

      this.prisma.household.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Households retrieved successfully.',
      data: households.map((household) => ({
        ...household,
        residentCount: household._count.residents,
        _count: undefined,
      })),

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
  // Get Household By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        residents: {
          select: {
            id: true,
            residentNumber: true,
            firstName: true,
            middleName: true,
            lastName: true,
            status: true,
            user: {
              select: {
                id: true,
                referenceNumber: true,
                firstName: true,
                lastName: true,
                status: true,
                account: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    return {
      success: true,
      message: 'Household retrieved successfully.',
      data: household,
    };
  }

  // ==========================================
  // Update Household
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateHouseholdDto) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    // ==========================================
    // Clean Inputs
    // ==========================================

    if (dto.block) dto.block = dto.block.trim();

    if (dto.lot) dto.lot = dto.lot.trim();

    if (dto.unit) dto.unit = dto.unit.trim();

    if (dto.address) dto.address = dto.address.trim();

    // ==========================================
    // Duplicate Block/Lot
    // ==========================================

    if (dto.block && dto.lot) {
      const existing = await this.prisma.household.findFirst({
        where: {
          communityId,
          block: dto.block,
          lot: dto.lot,
          deletedAt: null,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Household already exists.');
      }
    }

    // ==========================================
    // Status Transition: ACTIVE → INACTIVE
    // auto-deactivates the linked account
    // ==========================================

    const previousStatus = household.status;
    const nextStatus = dto.status ?? previousStatus;

    if (
      previousStatus === HouseholdStatus.ACTIVE &&
      nextStatus === HouseholdStatus.INACTIVE
    ) {
      await this.deactivateLinkedAccounts(id);
    }

    // ==========================================
    // Update Household
    // ==========================================

    const updatedHousehold = await this.prisma.household.update({
      where: {
        id,
      },

      data: {
        ...(dto.block !== undefined && {
          block: dto.block,
        }),

        ...(dto.lot !== undefined && {
          lot: dto.lot,
        }),

        ...(dto.unit !== undefined && {
          unit: dto.unit,
        }),

        ...(dto.address !== undefined && {
          address: dto.address,
        }),

        ...(dto.status && { status: dto.status }),
      },

      select: {
        id: true,
        block: true,
        lot: true,
        unit: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      success: true,
      message: 'Household updated successfully.',
      data: updatedHousehold,
    };
  }

  // ==========================================
  // Delete Household (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    const household = await this.prisma.household.findFirst({
      where: {
        id,
        communityId,
        deletedAt: null,
      },
    });

    if (!household) {
      throw new NotFoundException('Household not found.');
    }

    if (household.status === HouseholdStatus.ACTIVE) {
      await this.deactivateLinkedAccounts(id);
    }

    await this.prisma.household.update({
      where: {
        id,
      },

      data: {
        status: HouseholdStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Household deleted successfully.',
    };
  }
}

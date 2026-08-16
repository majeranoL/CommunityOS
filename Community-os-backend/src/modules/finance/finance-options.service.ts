import { Injectable } from '@nestjs/common';

import { HouseholdStatus, ResidentStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { FinanceOptionsQueryDto } from './dto/finance-options-query.dto';

@Injectable()
export class FinanceOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Household Options
  // ==========================================

  async householdOptions(
    communityId: string,
    query: FinanceOptionsQueryDto,
    scopeHouseholdId?: string,
  ) {
    const { page, limit, search } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
      status: HouseholdStatus.ACTIVE,
      ...(scopeHouseholdId ? { id: scopeHouseholdId } : {}),
    };

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

    const [households, total] = await this.prisma.$transaction([
      this.prisma.household.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          block: true,
          lot: true,
          unit: true,
          address: true,
          _count: {
            select: {
              residents: true,
            },
          },
        },
      }),
      this.prisma.household.count({ where }),
    ]);

    const items = households.map((household) => ({
      id: household.id,
      block: household.block,
      lot: household.lot,
      unit: household.unit,
      address: household.address,
      residentCount: household._count.residents,
    }));

    return {
      success: true,
      message: 'Households retrieved successfully.',
      data: items,
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
  // Resident Options
  // ==========================================

  async residentOptions(
    communityId: string,
    query: FinanceOptionsQueryDto,
    scopeHouseholdId?: string,
  ) {
    const { page, limit, search } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
      status: ResidentStatus.ACTIVE,
      ...(scopeHouseholdId ? { householdId: scopeHouseholdId } : {}),
    };

    if (search) {
      where.OR = [
        {
          residentNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          firstName: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          middleName: {
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
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [residents, total] = await this.prisma.$transaction([
      this.prisma.resident.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          householdId: true,
          firstName: true,
          middleName: true,
          lastName: true,
          suffix: true,
        },
      }),
      this.prisma.resident.count({ where }),
    ]);

    return {
      success: true,
      message: 'Residents retrieved successfully.',
      data: residents,
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
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ChargeRecurrence, FinanceCategory } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateChargeTypeDto } from './dto/charge-type.dto';
import { UpdateChargeTypeDto } from './dto/update-charge-type.dto';
import { ChargeTypeQueryDto } from './dto/charge-type-query.dto';

@Injectable()
export class ChargeTypesService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Charge Type
  // ==========================================

  async create(communityId: string, dto: CreateChargeTypeDto) {
    dto.code = dto.code.trim();
    dto.name = dto.name.trim();
    dto.description = dto.description?.trim();

    const existing = await this.prisma.chargeType.findFirst({
      where: {
        communityId,
        OR: [{ code: dto.code }, { name: dto.name }],
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        'A charge type with this code or name already exists.',
      );
    }

    const chargeType = await this.prisma.chargeType.create({
      data: {
        communityId,
        code: dto.code,
        name: dto.name,
        category: dto.category ?? FinanceCategory.DUES,
        recurrence: dto.recurrence ?? ChargeRecurrence.RECURRING,
        amount: dto.amount ?? 0,
        dueDay: dto.dueDay,
        description: dto.description,
        allowAdvancePayment: dto.allowAdvancePayment ?? false,
        advanceAppliesToOneTime: dto.advanceAppliesToOneTime ?? false,
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return {
      success: true,
      message: 'Charge type created successfully.',
      data: chargeType,
    };
  }

  // ==========================================
  // Get All Charge Types
  // ==========================================

  async findAll(communityId: string, query: ChargeTypeQueryDto) {
    const {
      page,
      limit,
      search,
      category,
      recurrence,
      isActive,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        {
          code: { contains: search, mode: 'insensitive' },
        },
        {
          name: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (recurrence) {
      where.recurrence = recurrence;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [chargeTypes, total] = await this.prisma.$transaction([
      this.prisma.chargeType.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { [sortBy]: order }],
        include: {
          _count: {
            select: {
              billingPeriods: {
                where: { deletedAt: null },
              },
              assessments: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      this.prisma.chargeType.count({ where }),
    ]);

    return {
      success: true,
      message: 'Charge types retrieved successfully.',
      data: chargeTypes,
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
  // Get Charge Type By ID
  // ==========================================

  async findOne(communityId: string, id: string) {
    const chargeType = await this.prisma.chargeType.findFirst({
      where: { id, communityId, deletedAt: null },
      include: {
        _count: {
          select: {
            billingPeriods: { where: { deletedAt: null } },
            assessments: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!chargeType) {
      throw new NotFoundException('Charge type not found.');
    }

    return {
      success: true,
      message: 'Charge type retrieved successfully.',
      data: chargeType,
    };
  }

  // ==========================================
  // Update Charge Type
  // ==========================================

  async update(communityId: string, id: string, dto: UpdateChargeTypeDto) {
    await this.findScoped(communityId, id);

    if (dto.code || dto.name) {
      const duplicate = await this.prisma.chargeType.findFirst({
        where: {
          communityId,
          deletedAt: null,
          NOT: { id },
          OR: [
            ...(dto.code ? [{ code: dto.code.trim() }] : []),
            ...(dto.name ? [{ name: dto.name.trim() }] : []),
          ],
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'A charge type with this code or name already exists.',
        );
      }
    }

    const updated = await this.prisma.chargeType.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code.trim() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.recurrence !== undefined && { recurrence: dto.recurrence }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.dueDay !== undefined && { dueDay: dto.dueDay }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim(),
        }),
        ...(dto.allowAdvancePayment !== undefined && {
          allowAdvancePayment: dto.allowAdvancePayment,
        }),
        ...(dto.advanceAppliesToOneTime !== undefined && {
          advanceAppliesToOneTime: dto.advanceAppliesToOneTime,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    return {
      success: true,
      message: 'Charge type updated successfully.',
      data: updated,
    };
  }

  // ==========================================
  // Delete Charge Type (Soft Delete)
  // ==========================================

  async remove(communityId: string, id: string) {
    await this.findScoped(communityId, id);

    await this.prisma.chargeType.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return {
      success: true,
      message: 'Charge type deleted successfully.',
    };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private async findScoped(communityId: string, id: string) {
    const chargeType = await this.prisma.chargeType.findFirst({
      where: { id, communityId, deletedAt: null },
    });

    if (!chargeType) {
      throw new NotFoundException('Charge type not found.');
    }

    return chargeType;
  }
}

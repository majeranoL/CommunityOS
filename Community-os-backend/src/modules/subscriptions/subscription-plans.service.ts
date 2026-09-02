import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BillingCycle, PlanTier, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateSubscriptionPlanDto } from './dto/create-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Create Plan
  // ==========================================

  async create(dto: CreateSubscriptionPlanDto) {
    // ==========================================
    // Clean Inputs
    // ==========================================

    dto.code = dto.code.trim().toLowerCase();
    dto.name = dto.name.trim();
    dto.description = dto.description?.trim();

    // ==========================================
    // Duplicate Code
    // ==========================================

    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('A plan with this code already exists.');
    }

    // ==========================================
    // Validate Feature IDs exist
    // ==========================================

    let featureIds = dto.featureIds ?? [];

    if (featureIds.length > 0) {
      const validFeatures = await this.prisma.feature.findMany({
        where: { id: { in: featureIds }, isActive: true },
        select: { id: true },
      });

      featureIds = validFeatures.map((f) => f.id);
    }

    // ==========================================
    // Create Plan + PlanFeature links
    // ==========================================

    const plan = await this.prisma.subscriptionPlan.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        billingCycle: dto.billingCycle ?? BillingCycle.MONTHLY,
        tier: dto.tier ?? PlanTier.STANDARD,
        features: dto.features ?? [],
        maxUsers: dto.maxUsers ?? 1,
        maxResidents: dto.maxResidents ?? 0,
        isActive: dto.isActive ?? true,
        includesAllFeatures: dto.includesAllFeatures ?? false,
        sortOrder: dto.sortOrder ?? 0,
        ...(featureIds.length > 0
          ? {
              planFeatures: {
                create: featureIds.map((featureId) => ({ featureId })),
              },
            }
          : {}),
      },
      include: {
        planFeatures: {
          include: {
            feature: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      message: 'Subscription plan created successfully.',
      data: plan,
    };
  }

  // ==========================================
  // Get All Plans
  // ==========================================

  async findAll(query: PlanQueryDto) {
    const { page, limit, search, includeInactive } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionPlanWhereInput = {
      deletedAt: null,
      ...(!includeInactive ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [plans, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
        include: {
          planFeatures: {
            include: {
              feature: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                  type: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return {
      success: true,
      message: 'Subscription plans retrieved successfully.',
      data: plans,
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
  // Get Plan By ID
  // ==========================================

  async findOne(id: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        planFeatures: {
          include: {
            feature: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    return {
      success: true,
      message: 'Subscription plan retrieved successfully.',
      data: plan,
    };
  }

  // ==========================================
  // Update Plan
  // ==========================================

  async update(id: string, dto: UpdateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    // ==========================================
    // Duplicate Code
    // ==========================================

    if (dto.code) {
      dto.code = dto.code.trim().toLowerCase();

      const existing = await this.prisma.subscriptionPlan.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('A plan with this code already exists.');
      }
    }

    // ==========================================
    // Validate and sync featureIds
    // ==========================================

    let featureIdsUpdate: string[] | undefined = undefined;

    if (dto.featureIds !== undefined) {
      let featureIds = dto.featureIds;

      if (featureIds.length > 0) {
        const validFeatures = await this.prisma.feature.findMany({
          where: { id: { in: featureIds }, isActive: true },
          select: { id: true },
        });
        featureIds = validFeatures.map((f) => f.id);
      }

      featureIdsUpdate = featureIds;
    }

    // ==========================================
    // Update Plan
    // ==========================================

    const updatedPlan = await this.prisma.$transaction(async (tx) => {
      // Sync PlanFeature records if featureIds provided
      if (featureIdsUpdate !== undefined) {
        // Remove existing
        await tx.planFeature.deleteMany({ where: { planId: id } });

        // Add new
        if (featureIdsUpdate.length > 0) {
          await tx.planFeature.createMany({
            data: featureIdsUpdate.map((featureId) => ({
              planId: id,
              featureId,
            })),
          });
        }
      }

      return tx.subscriptionPlan.update({
        where: { id },
        data: {
          ...(dto.code && { code: dto.code }),
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description?.trim(),
          }),
          ...(dto.price !== undefined && { price: dto.price }),
          ...(dto.billingCycle && { billingCycle: dto.billingCycle }),
          ...(dto.tier && { tier: dto.tier }),
          ...(dto.features !== undefined && { features: dto.features }),
          ...(dto.maxUsers !== undefined && { maxUsers: dto.maxUsers }),
          ...(dto.maxResidents !== undefined && {
            maxResidents: dto.maxResidents,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.includesAllFeatures !== undefined && {
            includesAllFeatures: dto.includesAllFeatures,
          }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
        include: {
          planFeatures: {
            include: {
              feature: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  description: true,
                  type: true,
                },
              },
            },
          },
        },
      });
    });

    return {
      success: true,
      message: 'Subscription plan updated successfully.',
      data: updatedPlan,
    };
  }

  // ==========================================
  // Delete Plan (Soft Delete)
  // ==========================================

  async remove(id: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }

    await this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Subscription plan deleted successfully.',
    };
  }
}

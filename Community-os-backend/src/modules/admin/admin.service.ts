import { Injectable, NotFoundException } from '@nestjs/common';

import {
  CommunityStatus,
  InvoiceStatus,
  SubscriptionStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { AdminCommunityQueryDto } from './dto/admin-community-query.dto';
import { UpdateCommunityStatusDto } from './dto/update-community-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Platform Overview
  // ==========================================

  async overview() {
    const [totalCommunities, activeCommunities, totalUsers, totalResidents] =
      await Promise.all([
        this.prisma.community.count({
          where: { deletedAt: null },
        }),
        this.prisma.community.count({
          where: { deletedAt: null, status: CommunityStatus.ACTIVE },
        }),
        this.prisma.user.count({
          where: { deletedAt: null },
        }),
        this.prisma.resident.count({
          where: { deletedAt: null },
        }),
      ]);

    const [activeSubscriptions, trialSubscriptions, recentSignups] =
      await Promise.all([
        this.prisma.subscription.count({
          where: { deletedAt: null, status: SubscriptionStatus.ACTIVE },
        }),
        this.prisma.subscription.count({
          where: { deletedAt: null, status: SubscriptionStatus.TRIAL },
        }),
        this.prisma.community.count({
          where: {
            deletedAt: null,
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    const monthlyRevenue = await this.prisma.invoice.aggregate({
      where: {
        deletedAt: null,
        status: InvoiceStatus.PAID,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      success: true,
      message: 'Platform overview retrieved successfully.',
      data: {
        totalCommunities,
        activeCommunities,
        totalUsers,
        totalResidents,
        activeSubscriptions,
        trialSubscriptions,
        recentSignups,
        collectedRevenue: monthlyRevenue._sum.amount ?? 0,
      },
    };
  }

  // ==========================================
  // List All Communities (all tenants)
  // ==========================================

  async findAllCommunities(query: AdminCommunityQueryDto) {
    const { page, limit, search, status, sortBy, order } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        {
          code: { contains: search, mode: 'insensitive' },
        },
        {
          slug: { contains: search, mode: 'insensitive' },
        },
        {
          displayName: { contains: search, mode: 'insensitive' },
        },
        {
          email: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [communities, total] = await Promise.all([
      this.prisma.community.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: order },
        select: {
          id: true,
          code: true,
          slug: true,
          displayName: true,
          email: true,
          contactNumber: true,
          address: true,
          logoUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              residents: true,
              households: true,
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              startsAt: true,
              endsAt: true,
              trialEndsAt: true,
              plan: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.community.count({ where }),
    ]);

    const formatted = communities.map((community) => ({
      ...community,
      subscription: community.subscription ?? null,
    }));

    return {
      success: true,
      message: 'Communities retrieved successfully.',
      data: formatted,
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
  // Community Detail
  // ==========================================

  async findOneCommunity(id: string) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        slug: true,
        displayName: true,
        description: true,
        email: true,
        contactNumber: true,
        address: true,
        logoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            residents: true,
            households: true,
            facilities: true,
            announcements: true,
            complaints: true,
            events: true,
          },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            trialEndsAt: true,
            autoRenew: true,
            plan: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                price: true,
                billingCycle: true,
              },
            },
          },
        },
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isPlatformAdmin: true,
            status: true,
            account: { select: { email: true } },
            roles: {
              select: { role: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
        },
      },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    return {
      success: true,
      message: 'Community retrieved successfully.',
      data: community,
    };
  }

  // ==========================================
  // Update Community Status
  // ==========================================

  async updateCommunityStatus(id: string, dto: UpdateCommunityStatusDto) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const updated = await this.prisma.community.update({
      where: { id },
      data: { status: dto.status },
      select: {
        id: true,
        code: true,
        slug: true,
        displayName: true,
        status: true,
      },
    });

    return {
      success: true,
      message: 'Community status updated successfully.',
      data: updated,
    };
  }

  // ==========================================
  // Delete Community (Soft Delete)
  // ==========================================

  async removeCommunity(id: string) {
    const community = await this.prisma.community.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    await this.prisma.community.update({
      where: { id },
      data: {
        status: CommunityStatus.INACTIVE,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Community deleted successfully.',
    };
  }

  // ==========================================
  // Tenant Subscription
  // ==========================================

  async findSubscription(communityId: string) {
    const community = await this.prisma.community.findFirst({
      where: { id: communityId, deletedAt: null },
      select: { id: true },
    });

    if (!community) {
      throw new NotFoundException('Community not found.');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { communityId, deletedAt: null },
      include: {
        plan: true,
        invoices: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return {
      success: true,
      message: 'Tenant subscription retrieved successfully.',
      data: subscription,
    };
  }
}

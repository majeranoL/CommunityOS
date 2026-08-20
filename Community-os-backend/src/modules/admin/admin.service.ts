import { Injectable, NotFoundException } from '@nestjs/common';

import {
  CommunityStatus,
  ComplaintStatus,
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
  // Platform Analytics
  // ==========================================

  async analytics() {
    const monthCount = 12;

    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    start.setMonth(start.getMonth() - (monthCount - 1));

    const monthKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    const buckets: string[] = [];
    const cursor = new Date(start);
    for (let i = 0; i < monthCount; i++) {
      buckets.push(monthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const [communities, users, paidInvoices, subscriptionStatus] =
      await Promise.all([
        this.prisma.community.findMany({
          where: { deletedAt: null, createdAt: { gte: start } },
          select: { createdAt: true },
        }),
        this.prisma.user.findMany({
          where: { deletedAt: null, createdAt: { gte: start } },
          select: { createdAt: true },
        }),
        this.prisma.invoice.findMany({
          where: {
            deletedAt: null,
            status: InvoiceStatus.PAID,
            createdAt: { gte: start },
          },
          select: { amount: true, createdAt: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
      ]);

    const communityCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const revenueByMonth = new Map<string, number>();

    for (const bucket of buckets) {
      communityCounts.set(bucket, 0);
      userCounts.set(bucket, 0);
      revenueByMonth.set(bucket, 0);
    }

    for (const community of communities) {
      const key = monthKey(community.createdAt);
      communityCounts.set(key, (communityCounts.get(key) ?? 0) + 1);
    }

    for (const user of users) {
      const key = monthKey(user.createdAt);
      userCounts.set(key, (userCounts.get(key) ?? 0) + 1);
    }

    for (const invoice of paidInvoices) {
      const key = monthKey(invoice.createdAt);
      revenueByMonth.set(
        key,
        (revenueByMonth.get(key) ?? 0) + Number(invoice.amount ?? 0),
      );
    }

    const growth = buckets.map((bucket) => ({
      month: bucket,
      communities: communityCounts.get(bucket) ?? 0,
      users: userCounts.get(bucket) ?? 0,
      revenue: revenueByMonth.get(bucket) ?? 0,
    }));

    return {
      success: true,
      message: 'Platform analytics retrieved successfully.',
      data: {
        growth,
        subscriptionStatus: subscriptionStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
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

  // ==========================================
  // Platform Monitoring — System Health
  // ==========================================

  async systemHealth() {
    const start = Date.now();

    let databaseStatus: 'up' | 'down' = 'up';
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      databaseStatus = 'down';
    }

    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();

    return {
      success: true,
      message: 'System health retrieved successfully.',
      data: {
        status: databaseStatus === 'up' ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(uptimeSec),
          human: this.formatUptime(uptimeSec),
        },
        database: {
          status: databaseStatus,
          latencyMs: dbLatencyMs,
        },
        memory: {
          rssBytes: mem.rss,
          heapUsedBytes: mem.heapUsed,
          heapTotalBytes: mem.heapTotal,
          externalBytes: mem.external,
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        responseMs: Date.now() - start,
      },
    };
  }

  // ==========================================
  // Platform Monitoring — Stats
  // ==========================================

  async platformStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCommunities,
      activeCommunities,
      totalUsers,
      activeUsers30d,
      totalResidents,
      totalHouseholds,
      totalComplaints,
      openComplaints,
      totalVisitors,
      checkedInVisitors,
      totalNotifications,
      unreadNotifications,
      totalAuditLogs,
      recentAuditLogs7d,
    ] = await Promise.all([
      this.prisma.community.count({ where: { deletedAt: null } }),
      this.prisma.community.count({ where: { deletedAt: null, status: CommunityStatus.ACTIVE } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, updatedAt: { gte: thirtyDaysAgo } } }),
      this.prisma.resident.count({ where: { deletedAt: null } }),
      this.prisma.household.count({ where: { deletedAt: null } }),
      this.prisma.complaint.count({ where: { deletedAt: null } }),
      this.prisma.complaint.count({
        where: { deletedAt: null, status: { in: [ComplaintStatus.OPEN, ComplaintStatus.IN_PROGRESS] } },
      }),
      this.prisma.visitor.count({ where: { deletedAt: null } }),
      this.prisma.visitor.count({ where: { deletedAt: null, status: 'CHECKED_IN' } }),
      this.prisma.notification.count({ where: {} }),
      this.prisma.notification.count({ where: { readAt: null } }),
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return {
      success: true,
      message: 'Platform stats retrieved successfully.',
      data: {
        communities: { total: totalCommunities, active: activeCommunities },
        users: { total: totalUsers, activeLast30Days: activeUsers30d },
        residents: { total: totalResidents },
        households: { total: totalHouseholds },
        complaints: { total: totalComplaints, open: openComplaints },
        visitors: { total: totalVisitors, currentlyCheckedIn: checkedInVisitors },
        notifications: { total: totalNotifications, unread: unreadNotifications },
        auditLogs: { total: totalAuditLogs, last7Days: recentAuditLogs7d },
      },
    };
  }

  private formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(' ');
  }
}

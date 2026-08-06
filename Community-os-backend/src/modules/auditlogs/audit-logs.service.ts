import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Record an audit entry
  // ==========================================

  async log(entry: {
    communityId: string;
    actorId?: string;
    action: string;
    entity: string;
    entityId?: string;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        communityId: entry.communityId,
        actorId: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before,
        after: entry.after,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }

  // ==========================================
  // Get All Audit Logs
  // ==========================================

  async findAll(communityId: string, query: AuditLogQueryDto) {
    const {
      page,
      limit,
      search,
      action,
      entity,
      actorId,
      from,
      to,
      sortBy,
      order,
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
    };

    // Search
    if (search) {
      where.OR = [
        {
          entity: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          entityId: {
            contains: search,
          },
        },
        {
          action: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (action) {
      where.action = {
        equals: action,
        mode: 'insensitive',
      };
    }

    if (entity) {
      where.entity = {
        equals: entity,
        mode: 'insensitive',
      };
    }

    if (actorId) {
      where.actorId = actorId;
    }

    if (from) {
      where.createdAt = {
        ...(where.createdAt ?? {}),
        gte: new Date(from),
      };
    }

    if (to) {
      where.createdAt = {
        ...(where.createdAt ?? {}),
        lte: new Date(to),
      };
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,

        skip,
        take: limit,

        orderBy: {
          [sortBy]: order,
        },

        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),

      this.prisma.auditLog.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Audit logs retrieved successfully.',
      data: logs,

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
  // Summary
  // ==========================================

  async summary(communityId: string) {
    const where = { communityId };

    const [total, byAction, byEntity] = await this.prisma.$transaction([
      this.prisma.auditLog.count({
        where,
      }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        orderBy: {
          action: 'asc',
        },
        _count: {
          action: true,
        },
      }),

      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        orderBy: {
          entity: 'asc',
        },
        _count: {
          entity: true,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Audit log summary retrieved successfully.',
      data: {
        total,
        byAction,
        byEntity,
      },
    };
  }

  // ==========================================
  // Purge old logs
  // ==========================================

  async purge(communityId: string, keepDays: number) {
    const cutoff = new Date();

    cutoff.setDate(cutoff.getDate() - keepDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        communityId,
        createdAt: {
          lt: cutoff,
        },
      },
    });

    return {
      success: true,
      message: 'Old audit logs purged successfully.',
      data: {
        deleted: result.count,
      },
    };
  }
}

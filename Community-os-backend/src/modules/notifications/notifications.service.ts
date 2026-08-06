import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // Public: Create a single notification
  // ==========================================

  async notify(
    communityId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        communityId,
        userId,
        type,
        title,
        message,
        link,
      },
    });
  }

  // ==========================================
  // Public: Create notifications for many users
  // ==========================================

  async notifyMany(
    communityId: string,
    userIds: string[],
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
  ) {
    if (userIds.length === 0) {
      return [];
    }

    const data = userIds.map((userId) => ({
      communityId,
      userId,
      type,
      title,
      message,
      link,
    }));

    return this.prisma.notification.createMany({
      data,
    });
  }

  // ==========================================
  // Public: Find community users by permission
  // ==========================================

  async userIdsWithPermission(
    communityId: string,
    permissionCode: string,
  ): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
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

    return users
      .filter((user) =>
        user.roles.some((userRole) =>
          userRole.role.permissions.some(
            (rolePermission) =>
              rolePermission.permission.code === permissionCode,
          ),
        ),
      )
      .map((user) => user.id);
  }

  // ==========================================
  // List notifications
  // ==========================================

  async findAll(
    communityId: string,
    userId: string,
    query: NotificationQueryDto,
  ) {
    const { page, limit, unreadOnly } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      communityId,
      userId,
    };

    if (unreadOnly) {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.notification.count({
        where,
      }),
      this.prisma.notification.count({
        where: {
          communityId,
          userId,
          readAt: null,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Notifications retrieved successfully.',
      data: notifications,
      unreadCount,
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
  // Unread count
  // ==========================================

  async unreadCount(communityId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        communityId,
        userId,
        readAt: null,
      },
    });

    return {
      success: true,
      message: 'Unread notification count retrieved successfully.',
      data: {
        count,
      },
    };
  }

  // ==========================================
  // Mark single notification as read
  // ==========================================

  async markRead(communityId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        communityId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: {
        id,
      },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
    });

    return {
      success: true,
      message: 'Notification marked as read.',
      data: updatedNotification,
    };
  }

  // ==========================================
  // Mark all notifications as read
  // ==========================================

  async markAllRead(communityId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        communityId,
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'All notifications marked as read.',
      data: {
        updated: result.count,
      },
    };
  }
}

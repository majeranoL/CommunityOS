import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, UserStatus } from '@prisma/client';

import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

import { NotificationEventsService } from './notification-events.service';
import { NotificationPrefsService } from './notification-prefs.service';
import { NotificationPushService } from './notification-push.service';

import { NotificationQueryDto } from './dto/notification-query.dto';

export enum NotificationEmailVariant {
  GENERIC = 'GENERIC',
  DUES = 'DUES',
}

export interface DispatchOptions {
  /** Which email template to use for the opt-in email channel. */
  emailVariant?: NotificationEmailVariant;
  /** Extra data passed to specialized email templates (e.g. dues details). */
  emailData?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: NotificationEventsService,
    private readonly prefsService: NotificationPrefsService,
    private readonly pushService: NotificationPushService,
    private readonly mailService: MailService,
  ) {}

  // ==========================================
  // Public: Create a single notification (in-app + live event)
  // ==========================================

  async notify(
    communityId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        communityId,
        userId,
        type,
        title,
        message,
        link,
      },
    });

    this.events.emitCreated(userId, {
      type: 'notification.created',
      data: notification,
    });

    return notification;
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

    const uniqueUserIds = [...new Set(userIds)];

    const data = uniqueUserIds.map((userId) => ({
      communityId,
      userId,
      type,
      title,
      message,
      link,
    }));

    const result = await this.prisma.notification.createMany({
      data,
    });

    for (const userId of uniqueUserIds) {
      this.events.emitCreated(userId, {
        type: 'notification.created',
        data: {
          communityId,
          userId,
          type,
          title,
          message,
          link,
          readAt: null,
        },
      });
    }

    return result;
  }

  // ==========================================
  // Dispatch: in-app + preference-aware push & email
  // ==========================================

  async dispatch(
    communityId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
    options?: DispatchOptions,
  ) {
    const notification = await this.notify(
      communityId,
      userId,
      type,
      title,
      message,
      link,
    );

    await this.routeChannels(communityId, userId, type, notification, options);

    return notification;
  }

  async dispatchMany(
    communityId: string,
    userIds: string[],
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
    options?: DispatchOptions,
  ) {
    const results: unknown[] = [];

    for (const userId of new Set(userIds)) {
      results.push(
        await this.dispatch(
          communityId,
          userId,
          type,
          title,
          message,
          link,
          options,
        ),
      );
    }

    return results;
  }

  /**
   * Notifies every member of a household (all residents with an active
   * user account). Used for monthly dues and household charges.
   */
  async dispatchToHousehold(
    communityId: string,
    householdId: string,
    type: NotificationType,
    title: string,
    message?: string,
    link?: string,
    options?: DispatchOptions,
  ) {
    const userIds = await this.userIdsForHousehold(communityId, householdId);
    return this.dispatchMany(
      communityId,
      userIds,
      type,
      title,
      message,
      link,
      options,
    );
  }

  // ==========================================
  // Household member resolution
  // ==========================================

  private async userIdsForHousehold(
    communityId: string,
    householdId: string,
  ): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        communityId,
        deletedAt: null,
        status: UserStatus.ACTIVE,
        resident: { householdId },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  // ==========================================
  // Channel routing (push + email) based on consent
  // ==========================================

  private async routeChannels(
    communityId: string,
    userId: string,
    type: NotificationType,
    notification: {
      id: string;
      type: NotificationType;
      title: string;
      message: string | null;
      link: string | null;
    },
    options?: DispatchOptions,
  ) {
    const decision = await this.prefsService.channelDecision(
      communityId,
      userId,
      type,
    );

    const deliveries: Array<{
      communityId: string;
      notificationId: string;
      userId: string;
      channel: string;
      status: string;
      error?: string;
      sentAt?: Date;
    }> = [
      {
        communityId,
        notificationId: notification.id,
        userId,
        channel: 'IN_APP',
        status: 'SENT',
        sentAt: new Date(),
      },
    ];

    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        account: { select: { email: true } },
        firstName: true,
      },
    });

    // Push
    if (decision.push && account) {
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { communityId, userId },
      });

      if (subscriptions.length > 0 && this.pushService.isConfigured) {
        const payload = JSON.stringify({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
        });

        for (const subscription of subscriptions) {
          const result = await this.pushService.send(subscription, payload);
          if (!result.ok && result.expired) {
            await this.prisma.pushSubscription
              .deleteMany({ where: { id: subscription.id } })
              .catch(() => undefined);
          }
          deliveries.push({
            communityId,
            notificationId: notification.id,
            userId,
            channel: 'PUSH',
            status: result.ok ? 'SENT' : 'FAILED',
            ...(result.ok
              ? { sentAt: new Date() }
              : {
                  error: result.expired
                    ? 'Push endpoint expired'
                    : 'Push delivery failed',
                }),
          });
        }
      } else {
        deliveries.push({
          communityId,
          notificationId: notification.id,
          userId,
          channel: 'PUSH',
          status: 'SKIPPED',
          error:
            subscriptions.length === 0
              ? 'No active push subscription'
              : 'Web push not configured',
        });
      }
    } else if (!decision.push && account) {
      deliveries.push({
        communityId,
        notificationId: notification.id,
        userId,
        channel: 'PUSH',
        status: 'SKIPPED',
        error: 'Push notifications disabled by user',
      });
    }

    // Email (opt-in only)
    if (decision.email && account?.account?.email) {
      try {
        await this.sendEmailForNotification(
          account.account.email,
          account.firstName,
          notification,
          communityId,
          options,
        );
        deliveries.push({
          communityId,
          notificationId: notification.id,
          userId,
          channel: 'EMAIL',
          status: 'SENT',
          sentAt: new Date(),
        });
      } catch (error) {
        deliveries.push({
          communityId,
          notificationId: notification.id,
          userId,
          channel: 'EMAIL',
          status: 'FAILED',
          error: (error as Error)?.message ?? 'Email delivery failed',
        });
      }
    } else if (!decision.email) {
      deliveries.push({
        communityId,
        notificationId: notification.id,
        userId,
        channel: 'EMAIL',
        status: 'SKIPPED',
        error: 'Email notifications disabled by user',
      });
    }

    if (deliveries.length > 0) {
      await this.prisma.notificationDelivery.createMany({ data: deliveries });
    }
  }

  private async sendEmailForNotification(
    to: string,
    firstName: string,
    notification: {
      title: string;
      message: string | null;
      link: string | null;
    },
    communityId: string,
    options?: DispatchOptions,
  ) {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { displayName: true },
    });

    const link = notification.link
      ? this.absoluteUrl(notification.link)
      : undefined;

    const variant = options?.emailVariant ?? NotificationEmailVariant.GENERIC;
    const emailData = (options?.emailData ?? {}) as {
      periodLabel?: string;
      amount?: string;
      dueDate?: string;
    };

    if (variant === NotificationEmailVariant.DUES) {
      await this.mailService.sendDuesIssuedEmail(to, firstName, {
        periodLabel: emailData.periodLabel ?? notification.title,
        amount: emailData.amount ?? '—',
        dueDate: emailData.dueDate ?? '—',
        communityName: community?.displayName,
        link,
      });
      return;
    }

    await this.mailService.sendNotificationEmail(to, firstName, {
      subject: notification.title,
      title: notification.title,
      message: notification.message,
      link,
      communityName: community?.displayName,
    });
  }

  private absoluteUrl(link: string): string {
    const baseUrl = process.env.APP_URL || 'http://localhost:5173';
    const segments = link.split('/').filter(Boolean);
    const [module, id] = segments;

    if (module === 'finance' || link.includes('my-dues')) {
      return `${baseUrl}/app/finance?tab=my-dues`;
    }

    if (id) {
      return `${baseUrl}/app/${module}?view=${encodeURIComponent(id)}`;
    }

    return `${baseUrl}/app`;
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
  // Unread counts grouped by module (type)
  // ==========================================

  async unreadByModule(communityId: string, userId: string) {
    const grouped = await this.prisma.notification.groupBy({
      by: ['type'],
      where: {
        communityId,
        userId,
        readAt: null,
      },
      _count: {
        type: true,
      },
    });

    const counts: Partial<Record<NotificationType, number>> = {};
    for (const row of grouped) {
      counts[row.type] = row._count.type;
    }

    return {
      success: true,
      message: 'Unread notification counts by module retrieved successfully.',
      data: counts,
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

import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

export interface ChannelDecision {
  inApp: boolean;
  push: boolean;
  email: boolean;
}

/**
 * Manages per-user consent for notification channels.
 *
 * Consent model:
 * - In-app is always enabled and cannot be disabled.
 * - Push is off until the user registers a browser push subscription.
 * - Email is off until the user explicitly opts in per module.
 */
@Injectable()
export class NotificationPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  async preferences(communityId: string, userId: string) {
    const rows = await this.prisma.notificationPreference.findMany({
      where: { communityId, userId },
      orderBy: { module: 'asc' },
    });

    const byModule = new Map(rows.map((row) => [row.module, row]));

    const preferences = Object.values(NotificationType).map((module) => {
      const row = byModule.get(module);
      return {
        module,
        inAppEnabled: row?.inAppEnabled ?? true,
        pushEnabled: row?.pushEnabled ?? false,
        emailEnabled: row?.emailEnabled ?? false,
      };
    });

    return {
      success: true,
      message: 'Notification preferences retrieved successfully.',
      data: { preferences },
    };
  }

  async channelDecision(
    communityId: string,
    userId: string,
    type: NotificationType,
  ): Promise<ChannelDecision> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_module: { userId, module: type },
      },
    });

    return {
      inApp: pref?.inAppEnabled ?? true,
      push: pref?.pushEnabled ?? false,
      email: pref?.emailEnabled ?? false,
    };
  }

  async upsertMany(
    communityId: string,
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    for (const entry of dto.preferences) {
      await this.prisma.notificationPreference.upsert({
        where: {
          userId_module: { userId, module: entry.module },
        },
        create: {
          communityId,
          userId,
          module: entry.module,
          emailEnabled: entry.emailEnabled,
          pushEnabled: entry.pushEnabled,
          inAppEnabled: entry.inAppEnabled || true,
        },
        update: {
          emailEnabled: entry.emailEnabled,
          pushEnabled: entry.pushEnabled,
          inAppEnabled: entry.inAppEnabled || true,
        },
      });
    }

    return this.preferences(communityId, userId);
  }

  async subscribe(
    communityId: string,
    userId: string,
    dto: CreatePushSubscriptionDto,
  ) {
    const endpoint = dto.endpoint.replace(/\/$/, '');

    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint },
    });

    if (existing) {
      if (existing.userId === userId) {
        return {
          success: true,
          message: 'Push subscription already active.',
          data: { subscribed: true },
        };
      }
      await this.prisma.pushSubscription.update({
        where: { endpoint },
        data: { userId, communityId, userAgent: dto.userAgent },
      });
    } else {
      await this.prisma.pushSubscription.create({
        data: {
          communityId,
          userId,
          endpoint,
          p256dh: dto.p256dh,
          auth: dto.auth,
          userAgent: dto.userAgent,
        },
      });
    }

    return {
      success: true,
      message: 'Push notifications enabled.',
      data: { subscribed: true },
    };
  }

  async unsubscribe(
    communityId: string,
    userId: string,
    endpoint?: string,
  ) {
    if (endpoint) {
      await this.prisma.pushSubscription.deleteMany({
        where: { communityId, userId, endpoint: endpoint.replace(/\/$/, '') },
      });
    } else {
      await this.prisma.pushSubscription.deleteMany({
        where: { communityId, userId },
      });
    }

    return {
      success: true,
      message: 'Push notifications disabled.',
      data: { subscribed: false },
    };
  }
}
import { NotificationType } from '@prisma/client';

import { NotificationPrefsService } from './notification-prefs.service';

describe('NotificationPrefsService', () => {
  let prismaMock: any;
  let service: NotificationPrefsService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      notificationPreference: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      pushSubscription: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    service = new NotificationPrefsService(prismaMock);
  });

  describe('channelDecision', () => {
    it('defaults to in-app on, push and email off', async () => {
      await expect(
        service.channelDecision('c-1', 'u-1', NotificationType.PAYMENT),
      ).resolves.toEqual({ inApp: true, push: false, email: false });
    });

    it('honours a stored preference row', async () => {
      prismaMock.notificationPreference.findUnique.mockResolvedValue({
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: true,
      });

      await expect(
        service.channelDecision('c-1', 'u-1', NotificationType.PAYMENT),
      ).resolves.toEqual({ inApp: true, push: true, email: true });
    });
  });

  describe('preferences', () => {
    it('returns one entry per module with consent defaults', async () => {
      const result = await service.preferences('c-1', 'u-1');

      expect(result.data.preferences).toHaveLength(
        Object.values(NotificationType).length,
      );
      expect(result.data.preferences[0]).toEqual(
        expect.objectContaining({
          inAppEnabled: true,
          pushEnabled: false,
          emailEnabled: false,
        }),
      );
    });
  });

  describe('upsertMany', () => {
    it('upserts each entry and keeps in-app enabled', async () => {
      await service.upsertMany('c-1', 'u-1', {
        preferences: [
          {
            module: NotificationType.ASSESSMENT,
            inAppEnabled: true,
            pushEnabled: true,
            emailEnabled: true,
          },
        ],
      });

      expect(prismaMock.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_module: {
              userId: 'u-1',
              module: NotificationType.ASSESSMENT,
            },
          },
        }),
      );
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('creates a subscription from the browser payload (trailing slash stripped)', async () => {
      await service.subscribe('c-1', 'u-1', {
        endpoint: 'https://push.example/x/y/',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
        userAgent: 'test-agent',
      });

      expect(prismaMock.pushSubscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          communityId: 'c-1',
          userId: 'u-1',
          endpoint: 'https://push.example/x/y',
          p256dh: 'p256dh-key',
          auth: 'auth-key',
          userAgent: 'test-agent',
        }),
      });
    });

    it('no-ops when the user already owns that endpoint', async () => {
      prismaMock.pushSubscription.findUnique.mockResolvedValue({
        endpoint: 'https://push.example/x/y',
        userId: 'u-1',
      });

      const result = await service.subscribe('c-1', 'u-1', {
        endpoint: 'https://push.example/x/y',
        p256dh: 'k',
        auth: 'a',
      });

      expect(prismaMock.pushSubscription.create).not.toHaveBeenCalled();
      expect(result.data.subscribed).toBe(true);
    });

    it('reassigns an endpoint previously claimed by another user', async () => {
      prismaMock.pushSubscription.findUnique.mockResolvedValue({
        endpoint: 'https://push.example/x/y',
        userId: 'u-other',
      });

      await service.subscribe('c-1', 'u-1', {
        endpoint: 'https://push.example/x/y',
        p256dh: 'k',
        auth: 'a',
      });

      expect(prismaMock.pushSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: 'https://push.example/x/y' },
        }),
      );
      expect(prismaMock.pushSubscription.create).not.toHaveBeenCalled();
    });

    it('removes a single endpoint or all for the user', async () => {
      await service.unsubscribe('c-1', 'u-1', 'https://push.example/x/y');

      expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { communityId: 'c-1', userId: 'u-1', endpoint: 'https://push.example/x/y' },
        }),
      );
    });
  });
});
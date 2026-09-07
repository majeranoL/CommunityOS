import { NotificationType, UserStatus } from '@prisma/client';

import {
  NotificationsService,
  NotificationEmailVariant,
} from './notifications.service';

describe('NotificationsService', () => {
  let prismaMock: any;
  let eventsMock: any;
  let prefsMock: any;
  let pushMock: any;
  let mailMock: any;
  let service: NotificationsService;

  const notificationRow = {
    id: 'n-1',
    type: NotificationType.PAYMENT,
    title: 'Payment received',
    message: 'A payment was recorded.',
    link: '/payments/p-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      notification: {
        create: jest.fn().mockResolvedValue(notificationRow),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      notificationDelivery: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      pushSubscription: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({
          firstName: 'Juan',
          account: { email: 'juan@example.com' },
        }),
      },
      community: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ displayName: 'Test Village' }),
      },
    };

    eventsMock = { emitCreated: jest.fn() };

    prefsMock = {
      channelDecision: jest
        .fn()
        .mockResolvedValue({ inApp: true, push: false, email: false }),
    };

    pushMock = {
      isConfigured: true,
      send: jest.fn().mockResolvedValue({ ok: true }),
    };

    mailMock = {
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
      sendDuesIssuedEmail: jest.fn().mockResolvedValue(undefined),
    };

    service = new NotificationsService(
      prismaMock,
      eventsMock,
      prefsMock,
      pushMock,
      mailMock,
    );
  });

  describe('notify / notifyMany', () => {
    it('creates an in-app notification and emits a live event', async () => {
      await service.notify(
        'c-1',
        'u-1',
        NotificationType.PAYMENT,
        'Payment received',
      );

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          communityId: 'c-1',
          userId: 'u-1',
          type: NotificationType.PAYMENT,
        }),
      });
      expect(eventsMock.emitCreated).toHaveBeenCalledWith('u-1', {
        type: 'notification.created',
        data: notificationRow,
      });
    });

    it('does not duplicate users when the same id is listed twice', async () => {
      await service.notifyMany(
        'c-1',
        ['u-1', 'u-1'],
        NotificationType.PAYMENT,
        'x',
      );

      expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            communityId: 'c-1',
            userId: 'u-1',
            type: NotificationType.PAYMENT,
            title: 'x',
            message: undefined,
            link: undefined,
          },
        ],
      });
      expect(eventsMock.emitCreated).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispatch channel routing', () => {
    it('skips push and email when neither is opted in', async () => {
      await service.dispatch(
        'c-1',
        'u-1',
        NotificationType.PAYMENT,
        'Payment received',
      );

      expect(pushMock.send).not.toHaveBeenCalled();
      expect(mailMock.sendNotificationEmail).not.toHaveBeenCalled();

      const deliveries =
        prismaMock.notificationDelivery.createMany.mock.calls[0][0].data;
      expect(deliveries.map((d: any) => d.status)).toEqual([
        'SENT',
        'SKIPPED',
        'SKIPPED',
      ]);
    });

    it('pushes to every active browser subscription when push is enabled', async () => {
      prismaMock.pushSubscription.findMany.mockResolvedValue([
        { id: 'sub-1', endpoint: 'https://push/a' },
        { id: 'sub-2', endpoint: 'https://push/b' },
      ]);
      prefsMock.channelDecision.mockResolvedValue({
        inApp: true,
        push: true,
        email: false,
      });

      await service.dispatch(
        'c-1',
        'u-1',
        NotificationType.PAYMENT,
        'Payment received',
      );

      expect(pushMock.send).toHaveBeenCalledTimes(2);

      const deliveries =
        prismaMock.notificationDelivery.createMany.mock.calls[0][0].data;
      expect(
        deliveries
          .filter((d: any) => d.channel === 'PUSH')
          .map((d: any) => d.status),
      ).toEqual(['SENT', 'SENT']);
    });

    it('removes a push subscription whose endpoint has expired', async () => {
      prismaMock.pushSubscription.findMany.mockResolvedValue([
        { id: 'sub-1', endpoint: 'https://push/expired' },
      ]);
      pushMock.send.mockResolvedValue({ ok: false, expired: true });
      prefsMock.channelDecision.mockResolvedValue({
        inApp: true,
        push: true,
        email: false,
      });

      await service.dispatch(
        'c-1',
        'u-1',
        NotificationType.PAYMENT,
        'Payment received',
      );

      expect(prismaMock.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });

    it('sends the dues email template when opted in', async () => {
      prismaMock.notification.create.mockResolvedValue({
        ...notificationRow,
        id: 'n-dues',
        type: NotificationType.ASSESSMENT,
        link: '/finance/my-dues',
      });
      prefsMock.channelDecision.mockResolvedValue({
        inApp: true,
        push: false,
        email: true,
      });

      await service.dispatch(
        'c-1',
        'u-1',
        NotificationType.ASSESSMENT,
        'Monthly Dues issued',
        'Dues for August',
        '/finance/my-dues',
        {
          emailVariant: NotificationEmailVariant.DUES,
          emailData: {
            periodLabel: 'Monthly Dues — August',
            amount: '₱250.00',
            dueDate: 'Sep 5, 2026',
          },
        },
      );

      expect(mailMock.sendDuesIssuedEmail).toHaveBeenCalledTimes(1);
      expect(mailMock.sendDuesIssuedEmail).toHaveBeenCalledWith(
        'juan@example.com',
        'Juan',
        expect.objectContaining({
          periodLabel: 'Monthly Dues — August',
          amount: '₱250.00',
          link: expect.stringContaining('/app/finance?tab=my-dues'),
        }),
      );
    });
  });

  describe('dispatchToHousehold', () => {
    it('notifies every active member of the household', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'u-1' },
        { id: 'u-2' },
      ]);
      prismaMock.notification.create
        .mockResolvedValueOnce({ ...notificationRow, id: 'n-1' })
        .mockResolvedValueOnce({ ...notificationRow, id: 'n-2' });

      await service.dispatchToHousehold(
        'c-1',
        'hh-1',
        NotificationType.ASSESSMENT,
        'Dues issued',
        'Your monthly dues have been issued.',
        '/finance/my-dues',
      );

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            communityId: 'c-1',
            status: UserStatus.ACTIVE,
            resident: { householdId: 'hh-1' },
          }),
        }),
      );
      expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    });

    it('does nothing when the household has no linked user accounts', async () => {
      await service.dispatchToHousehold(
        'c-1',
        'hh-empty',
        NotificationType.ASSESSMENT,
        'Dues issued',
      );

      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('unreadByModule', () => {
    it('returns unread counts grouped by module for the current user', async () => {
      prismaMock.notification.groupBy.mockResolvedValue([
        { type: NotificationType.COMPLAINT, _count: { type: 5 } },
        { type: NotificationType.RESERVATION, _count: { type: 2 } },
        { type: NotificationType.ANNOUNCEMENT, _count: { type: 1 } },
      ]);

      const result = await service.unreadByModule('c-1', 'u-1');

      expect(prismaMock.notification.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: {
          communityId: 'c-1',
          userId: 'u-1',
          readAt: null,
        },
        _count: {
          type: true,
        },
      });

      expect(result.data).toEqual({
        COMPLAINT: 5,
        RESERVATION: 2,
        ANNOUNCEMENT: 1,
      });
    });

    it('returns an empty map when the user has no unread notifications', async () => {
      prismaMock.notification.groupBy.mockResolvedValue([]);

      const result = await service.unreadByModule('c-1', 'u-1');

      expect(result.data).toEqual({});
    });
  });
});

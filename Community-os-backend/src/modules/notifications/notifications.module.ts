import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';

import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../mail/mail.module';

import { NotificationsController } from './notifications.controller';
import { NotificationStreamController } from './notification-stream.controller';
import { NotificationsService } from './notifications.service';
import { NotificationPrefsService } from './notification-prefs.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationPushService } from './notification-push.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET!,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN! as StringValue,
      },
    }),
  ],
  controllers: [NotificationsController, NotificationStreamController],
  providers: [
    NotificationsService,
    NotificationPrefsService,
    NotificationEventsService,
    NotificationPushService,
  ],
  exports: [
    NotificationsService,
    NotificationPrefsService,
    NotificationEventsService,
  ],
})
export class NotificationsModule {}

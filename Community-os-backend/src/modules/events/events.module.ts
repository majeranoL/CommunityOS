import { Module } from '@nestjs/common';

import { EventsController } from './events.controller';
import { EventsService } from './events.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}

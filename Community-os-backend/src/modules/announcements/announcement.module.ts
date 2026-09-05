import { Module } from '@nestjs/common';

import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],

  controllers: [AnnouncementController],

  providers: [AnnouncementService],

  exports: [AnnouncementService],
})
export class AnnouncementModule {}

import { Module } from '@nestjs/common';

import { FacilitiesController } from './facilities.controller';
import { FacilitiesService } from './facilities.service';
import { FacilityItemsService } from './facility-items.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FacilitiesController],
  providers: [FacilitiesService, FacilityItemsService],
  exports: [FacilitiesService, FacilityItemsService],
})
export class FacilitiesModule {}

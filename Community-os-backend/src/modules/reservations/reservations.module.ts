import { Module } from '@nestjs/common';

import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

import { FeaturesModule } from '../features/features.module';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    FeaturesModule,
    HouseholdsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}

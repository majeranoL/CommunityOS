import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { FeaturesModule } from '../features/features.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';

import { VehicleStickersController } from './vehicle-stickers.controller';
import { VehicleStickersService } from './vehicle-stickers.service';

@Module({
  imports: [PrismaModule, FeaturesModule, NotificationsModule, FinanceModule],
  controllers: [VehicleStickersController],
  providers: [VehicleStickersService],
  exports: [VehicleStickersService],
})
export class VehicleStickersModule {}

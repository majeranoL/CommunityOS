import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { FeaturesModule } from '../features/features.module';

import { VehicleStickersController } from './vehicle-stickers.controller';
import { VehicleStickersService } from './vehicle-stickers.service';

@Module({
  imports: [PrismaModule, FeaturesModule],
  controllers: [VehicleStickersController],
  providers: [VehicleStickersService],
  exports: [VehicleStickersService],
})
export class VehicleStickersModule {}

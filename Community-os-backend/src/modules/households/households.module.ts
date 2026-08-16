import { Module } from '@nestjs/common';

import { HouseholdsController } from './households.controller';
import { HouseholdsService } from './households.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { FeaturesModule } from '../features/features.module';

@Module({
  imports: [PrismaModule, FeaturesModule],
  controllers: [HouseholdsController],
  providers: [HouseholdsService],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}

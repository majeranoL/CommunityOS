import { Module } from '@nestjs/common';

import { GoodStandingController } from './good-standing.controller';
import { GoodStandingService } from './good-standing.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { FeaturesModule } from '../features/features.module';

@Module({
  imports: [PrismaModule, FeaturesModule],
  controllers: [GoodStandingController],
  providers: [GoodStandingService],
  exports: [GoodStandingService],
})
export class GoodStandingModule {}

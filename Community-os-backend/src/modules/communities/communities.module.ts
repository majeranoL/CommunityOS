import { Module } from '@nestjs/common';

import { CommunitiesController } from './communities.controller';
import { CommunitiesService } from './communities.service';

import { FeaturesModule } from '../features/features.module';

import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, FeaturesModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}

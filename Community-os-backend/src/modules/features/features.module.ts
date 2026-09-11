import { Module } from '@nestjs/common';

import { FeaturesController } from './features.controller';
import { CommunityFeaturesController } from './community-features.controller';
import { FeaturesService } from './features.service';
import { FeatureProvisioningService } from './feature-provisioning.service';

import { FeatureGuard } from '../../common/guards/feature.guard';

import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeaturesController, CommunityFeaturesController],
  providers: [FeaturesService, FeatureGuard, FeatureProvisioningService],
  exports: [FeaturesService, FeatureGuard],
})
export class FeaturesModule {}

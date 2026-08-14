import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { FeaturesService } from './features.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('features')
@UseGuards(JwtAuthGuard)
export class CommunityFeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  // ==========================================
  // Enabled Features for Current Community
  // ==========================================

  @Get()
  enabled(@Request() req: any) {
    return this.featuresService.findEnabledByCommunity(req.user.community.id);
  }
}

import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';

import { AnalyticsService } from './analytics.service';

import { AnalyticsQueryDto } from './dto/analytics-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ==========================================
  // Financial Summary
  // ==========================================

  @Get('financial')
  @Permissions('analytics.view')
  financial(@Request() req: any, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.financial(req.user.community.id, query.month);
  }

  // ==========================================
  // Trends
  // ==========================================

  @Get('trends')
  @Permissions('analytics.view')
  trends(@Request() req: any, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.trends(req.user.community.id, query.months);
  }

  // ==========================================
  // Status Breakdown
  // ==========================================

  @Get('status-breakdown')
  @Permissions('analytics.view')
  statusBreakdown(@Request() req: any) {
    return this.analyticsService.statusBreakdown(req.user.community.id);
  }
}

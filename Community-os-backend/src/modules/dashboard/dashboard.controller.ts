import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ==========================================
  // Overview
  // ==========================================

  @Get('overview')
  @Permissions('dashboard.view')
  overview(@Request() req: any) {
    return this.dashboardService.overview(req.user.community.id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { DuesMonthsService } from './dues-months.service';
import { CreateDuesMonthDto } from './dto/dues-month.dto';

@Controller('finance/dues-months')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DuesMonthsController {
  constructor(private readonly duesMonthsService: DuesMonthsService) {}

  // ==========================================
  // Create / fill a dues month
  // ==========================================

  @Post()
  @Permissions('assessment.create')
  create(@Request() req: any, @Body() dto: CreateDuesMonthDto) {
    return this.duesMonthsService.createMonth(req.user.community.id, dto);
  }

  // ==========================================
  // List all dues months
  // ==========================================

  @Get()
  @Permissions('assessment.view')
  list(@Request() req: any) {
    return this.duesMonthsService.listMonths(req.user.community.id);
  }

  // ==========================================
  // Single month household breakdown
  // ==========================================

  @Get(':periodKey')
  @Permissions('assessment.view')
  get(@Request() req: any, @Param('periodKey') periodKey: string) {
    return this.duesMonthsService.getMonth(req.user.community.id, periodKey);
  }

  // ==========================================
  // Add households created after the month
  // ==========================================

  @Post(':periodKey/sync-households')
  @Permissions('assessment.create')
  syncHouseholds(@Request() req: any, @Param('periodKey') periodKey: string) {
    return this.duesMonthsService.syncHouseholds(
      req.user.community.id,
      periodKey,
    );
  }
}

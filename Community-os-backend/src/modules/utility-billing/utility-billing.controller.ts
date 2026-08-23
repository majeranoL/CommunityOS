import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { UtilityBillingService } from './utility-billing.service';

import {
  CreateUtilityConfigDto,
  CreateUtilityReadingDto,
  GenerateUtilityBillsDto,
  UpdateUtilityConfigDto,
  UpdateUtilityReadingDto,
  UtilityConfigQueryDto,
  UtilityReadingQueryDto,
} from './dto/utility-billing.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('utility-billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UtilityBillingController {
  constructor(private readonly utilityBillingService: UtilityBillingService) {}

  private resolveScope(user: any): string | undefined {
    const canViewAll =
      user?.permissions?.includes('finance.view_all') ||
      user?.permissions?.includes('finance.manage');

    if (canViewAll) return undefined;

    return user.resident?.household?.id;
  }

  // ==========================================
  // Configs
  // ==========================================

  @Post('configs')
  @Permissions('finance.manage')
  createConfig(@Request() req: any, @Body() dto: CreateUtilityConfigDto) {
    return this.utilityBillingService.createConfig(req.user.community.id, dto);
  }

  @Get('configs')
  @Permissions('finance.view_own')
  findConfigs(@Request() req: any, @Query() query: UtilityConfigQueryDto) {
    return this.utilityBillingService.findConfigs(req.user.community.id, query);
  }

  @Patch('configs/:id')
  @Permissions('finance.manage')
  updateConfig(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUtilityConfigDto,
  ) {
    return this.utilityBillingService.updateConfig(
      req.user.community.id,
      id,
      dto,
    );
  }

  @Delete('configs/:id')
  @Permissions('finance.manage')
  removeConfig(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.utilityBillingService.removeConfig(req.user.community.id, id);
  }

  // ==========================================
  // Readings
  // ==========================================

  @Post('readings')
  @Permissions('finance.manage')
  createReading(@Request() req: any, @Body() dto: CreateUtilityReadingDto) {
    return this.utilityBillingService.createReading(
      req.user.community.id,
      req.user.id,
      dto,
    );
  }

  @Get('readings')
  @Permissions('finance.view_own')
  findReadings(@Request() req: any, @Query() query: UtilityReadingQueryDto) {
    return this.utilityBillingService.findReadings(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }

  @Patch('readings/:id')
  @Permissions('finance.manage')
  updateReading(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUtilityReadingDto,
  ) {
    return this.utilityBillingService.updateReading(
      req.user.community.id,
      id,
      dto,
    );
  }

  @Delete('readings/:id')
  @Permissions('finance.manage')
  removeReading(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.utilityBillingService.removeReading(req.user.community.id, id);
  }

  // ==========================================
  // Bill generation
  // ==========================================

  @Post('generate')
  @Permissions('finance.manage')
  generateBills(@Request() req: any, @Body() dto: GenerateUtilityBillsDto) {
    return this.utilityBillingService.generateBills(req.user.community.id, dto);
  }
}

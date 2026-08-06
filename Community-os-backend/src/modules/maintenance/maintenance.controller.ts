import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { MaintenanceService } from './maintenance.service';

import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceQueryDto } from './dto/maintenance-query.dto';
import { AssignMaintenanceDto } from './dto/assign-maintenance.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  // ==========================================
  // Create Maintenance
  // ==========================================

  @Post()
  @Permissions('maintenance.create')
  create(@Request() req: any, @Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Maintenance
  // ==========================================

  @Get()
  @Permissions('maintenance.view')
  findAll(@Request() req: any, @Query() query: MaintenanceQueryDto) {
    return this.maintenanceService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Maintenance By ID
  // ==========================================

  @Get(':id')
  @Permissions('maintenance.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Maintenance
  // ==========================================

  @Put(':id')
  @Permissions('maintenance.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Maintenance
  // ==========================================

  @Delete(':id')
  @Permissions('maintenance.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Assign Maintenance
  // ==========================================

  @Patch(':id/assign')
  @Permissions('maintenance.assign')
  assign(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignMaintenanceDto,
  ) {
    return this.maintenanceService.assign(
      req.user.community.id,
      id,
      dto.staffId,
    );
  }

  // ==========================================
  // Mark In Progress
  // ==========================================

  @Patch(':id/start')
  @Permissions('maintenance.start')
  start(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.start(req.user.community.id, id);
  }

  // ==========================================
  // Mark Resolved
  // ==========================================

  @Patch(':id/resolve')
  @Permissions('maintenance.resolve')
  resolve(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.resolve(req.user.community.id, id);
  }

  // ==========================================
  // Cancel Maintenance
  // ==========================================

  @Patch(':id/cancel')
  @Permissions('maintenance.cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.maintenanceService.cancel(req.user.community.id, id);
  }
}

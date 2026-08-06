import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { VehiclesService } from './vehicles.service';

import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ==========================================
  // Create Vehicle
  // ==========================================

  @Post()
  @Permissions('vehicle.create')
  create(@Request() req: any, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Vehicles
  // ==========================================

  @Get()
  @Permissions('vehicle.view')
  findAll(@Request() req: any, @Query() query: VehicleQueryDto) {
    return this.vehiclesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Vehicle By ID
  // ==========================================

  @Get(':id')
  @Permissions('vehicle.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Vehicle
  // ==========================================

  @Put(':id')
  @Permissions('vehicle.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Vehicle
  // ==========================================

  @Delete(':id')
  @Permissions('vehicle.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.remove(req.user.community.id, id);
  }
}

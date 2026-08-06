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

import { FacilitiesService } from './facilities.service';

import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilityQueryDto } from './dto/facility-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('facilities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  // ==========================================
  // Create Facility
  // ==========================================

  @Post()
  @Permissions('facility.create')
  create(@Request() req: any, @Body() dto: CreateFacilityDto) {
    return this.facilitiesService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Facilities
  // ==========================================

  @Get()
  @Permissions('facility.view')
  findAll(@Request() req: any, @Query() query: FacilityQueryDto) {
    return this.facilitiesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Facility By ID
  // ==========================================

  @Get(':id')
  @Permissions('facility.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.facilitiesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Facility
  // ==========================================

  @Put(':id')
  @Permissions('facility.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFacilityDto,
  ) {
    return this.facilitiesService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Facility
  // ==========================================

  @Delete(':id')
  @Permissions('facility.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.facilitiesService.remove(req.user.community.id, id);
  }
}

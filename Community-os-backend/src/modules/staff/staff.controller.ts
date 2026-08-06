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

import { StaffService } from './staff.service';

import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffQueryDto } from './dto/staff-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  // ==========================================
  // Create Staff
  // ==========================================

  @Post()
  @Permissions('staff.create')
  create(@Request() req: any, @Body() dto: CreateStaffDto) {
    return this.staffService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Staff
  // ==========================================

  @Get()
  @Permissions('staff.view')
  findAll(@Request() req: any, @Query() query: StaffQueryDto) {
    return this.staffService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Staff By ID
  // ==========================================

  @Get(':id')
  @Permissions('staff.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Staff
  // ==========================================

  @Put(':id')
  @Permissions('staff.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Staff
  // ==========================================

  @Delete(':id')
  @Permissions('staff.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.remove(req.user.community.id, id);
  }
}

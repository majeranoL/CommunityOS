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

import { UpdateResidentDto } from './dto/update-resident.dto';

import { ResidentService } from './resident.service';

import { CreateResidentDto } from './dto/create-resident.dto';
import { ResidentQueryDto } from './dto/resident-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('residents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResidentController {
  constructor(private readonly residentService: ResidentService) {}

  // ==========================================
  // Create Resident
  // ==========================================

  @Post()
  @Permissions('resident.create')
  create(@Request() req: any, @Body() dto: CreateResidentDto) {
    return this.residentService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Residents
  // ==========================================

  @Get()
  @Permissions('resident.view')
  findAll(@Request() req: any, @Query() query: ResidentQueryDto) {
    return this.residentService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Resident By ID
  // ==========================================

  @Get(':id')
  @Permissions('resident.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.residentService.findOne(req.user.community.id, id);
  }
  @Put(':id')
  @Permissions('resident.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResidentDto,
  ) {
    return this.residentService.update(req.user.community.id, id, dto);
  }
  @Delete(':id')
  @Permissions('resident.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.residentService.remove(req.user.community.id, id);
  }
}

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

import { VisitorsService } from './visitors.service';

import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('visitors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  // ==========================================
  // Create Visitor
  // ==========================================

  @Post()
  @Permissions('visitor.create')
  create(@Request() req: any, @Body() dto: CreateVisitorDto) {
    return this.visitorsService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Visitors
  // ==========================================

  @Get()
  @Permissions('visitor.view')
  findAll(@Request() req: any, @Query() query: VisitorQueryDto) {
    return this.visitorsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Visitor By ID
  // ==========================================

  @Get(':id')
  @Permissions('visitor.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Visitor
  // ==========================================

  @Put(':id')
  @Permissions('visitor.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitorDto,
  ) {
    return this.visitorsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Visitor
  // ==========================================

  @Delete(':id')
  @Permissions('visitor.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Check In Visitor
  // ==========================================

  @Patch(':id/check-in')
  @Permissions('visitor.check-in')
  checkIn(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.checkIn(req.user.community.id, id);
  }

  // ==========================================
  // Check Out Visitor
  // ==========================================

  @Patch(':id/check-out')
  @Permissions('visitor.check-out')
  checkOut(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.checkOut(req.user.community.id, id);
  }

  // ==========================================
  // Cancel Visitor
  // ==========================================

  @Patch(':id/cancel')
  @Permissions('visitor.cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.cancel(req.user.community.id, id);
  }
}

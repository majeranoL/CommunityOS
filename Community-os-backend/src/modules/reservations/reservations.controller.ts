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

import { ReservationsService } from './reservations.service';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationQueryDto } from './dto/reservation-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('reservations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ==========================================
  // Create Reservation
  // ==========================================

  @Post()
  @Permissions('reservation.create')
  create(@Request() req: any, @Body() dto: CreateReservationDto) {
    return this.reservationsService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Reservations
  // ==========================================

  @Get()
  @Permissions('reservation.view')
  findAll(@Request() req: any, @Query() query: ReservationQueryDto) {
    return this.reservationsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Reservation By ID
  // ==========================================

  @Get(':id')
  @Permissions('reservation.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Reservation
  // ==========================================

  @Put(':id')
  @Permissions('reservation.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Reservation
  // ==========================================

  @Delete(':id')
  @Permissions('reservation.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Approve Reservation
  // ==========================================

  @Patch(':id/approve')
  @Permissions('reservation.approve')
  approve(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.approve(req.user.community.id, id);
  }

  // ==========================================
  // Reject Reservation
  // ==========================================

  @Patch(':id/reject')
  @Permissions('reservation.reject')
  reject(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.reject(req.user.community.id, id);
  }

  // ==========================================
  // Cancel Reservation
  // ==========================================

  @Patch(':id/cancel')
  @Permissions('reservation.cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.cancel(req.user.community.id, id);
  }

  // ==========================================
  // Complete Reservation
  // ==========================================

  @Patch(':id/complete')
  @Permissions('reservation.complete')
  complete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.reservationsService.complete(req.user.community.id, id);
  }
}

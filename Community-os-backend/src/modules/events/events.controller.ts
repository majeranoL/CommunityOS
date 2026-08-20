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

import { EventsService } from './events.service';

import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==========================================
  // Create Event
  // ==========================================

  @Post()
  @Permissions('event.create')
  create(@Request() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.create(req.user.community.id, req.user.id, dto);
  }

  // ==========================================
  // Get All Events
  // ==========================================

  @Get()
  @Permissions('event.view')
  findAll(@Request() req: any, @Query() query: EventQueryDto) {
    return this.eventsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Event By ID
  // ==========================================

  @Get(':id')
  @Permissions('event.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(req.user.community.id, id, req.user.id);
  }

  // ==========================================
  // Update Event
  // ==========================================

  @Put(':id')
  @Permissions('event.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Event
  // ==========================================

  @Delete(':id')
  @Permissions('event.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Publish Event
  // ==========================================

  @Patch(':id/publish')
  @Permissions('event.publish')
  publish(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.publish(req.user.community.id, id);
  }

  // ==========================================
  // Cancel Event
  // ==========================================

  @Patch(':id/cancel')
  @Permissions('event.cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.cancel(req.user.community.id, id);
  }

  // ==========================================
  // Mark Event Completed
  // ==========================================

  @Patch(':id/complete')
  @Permissions('event.complete')
  complete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.complete(req.user.community.id, id);
  }

  // ==========================================
  // RSVP
  // ==========================================

  @Post(':id/rsvp')
  @Permissions('event.view')
  rsvp(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.rsvp(req.user.community.id, id, req.user.id);
  }

  @Delete(':id/rsvp')
  @Permissions('event.view')
  cancelRsvp(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.cancelRsvp(
      req.user.community.id,
      id,
      req.user.id,
    );
  }

  @Get(':id/attendees')
  @Permissions('event.view')
  getAttendees(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getAttendees(req.user.community.id, id);
  }
}

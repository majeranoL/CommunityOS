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

import { AnnouncementService } from './announcement.service';

import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // ==========================================
  // Create Announcement
  // ==========================================

  @Post()
  @Permissions('announcement.create')
  create(@Request() req: any, @Body() dto: CreateAnnouncementDto) {
    return this.announcementService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Announcements
  // ==========================================

  @Get()
  @Permissions('announcement.view')
  findAll(@Request() req: any, @Query() query: AnnouncementQueryDto) {
    return this.announcementService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Announcement By ID
  // ==========================================

  @Get(':id')
  @Permissions('announcement.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.announcementService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Announcement
  // ==========================================

  @Put(':id')
  @Permissions('announcement.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Announcement
  // ==========================================

  @Delete(':id')
  @Permissions('announcement.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.announcementService.remove(req.user.community.id, id);
  }

  @Patch(':id/publish')
  @Permissions('announcement.publish')
  publish(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.announcementService.publish(req.user.community.id, id);
  }
}

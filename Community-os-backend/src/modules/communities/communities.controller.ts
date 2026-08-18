import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { CommunitiesService } from './communities.service';

import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { CommunityQueryDto } from './dto/community-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('communities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  // ==========================================
  // Create Community
  // ==========================================

  @Post()
  @Permissions('community.create')
  create(@Body() dto: CreateCommunityDto) {
    return this.communitiesService.create(dto);
  }

  // ==========================================
  // Get All Communities
  // ==========================================

  @Get()
  @Permissions('community.view')
  findAll(@Request() req: any, @Query() query: CommunityQueryDto) {
    return this.communitiesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Community By ID
  // ==========================================

  @Get(':id')
  @Permissions('community.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.communitiesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Community
  // ==========================================

  @Put(':id')
  @Permissions('community.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    return this.communitiesService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Get Community Branding
  // ==========================================

  @Get('me/branding')
  @Permissions('community.view')
  getBranding(@Request() req: any) {
    return this.communitiesService.getBranding(req.user.community.id);
  }

  // ==========================================
  // Update Community Branding
  // ==========================================

  @Patch('me/branding')
  @Permissions('community.branding')
  updateBranding(
    @Request() req: any,
    @Body() dto: { primaryColor?: string; accentColor?: string; sidebarColor?: string; faviconUrl?: string; logoUrl?: string },
  ) {
    return this.communitiesService.updateBranding(req.user.community.id, dto);
  }

  // ==========================================
  // Delete Community
  // ==========================================

  @Delete(':id')
  @Permissions('community.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.communitiesService.remove(req.user.community.id, id);
  }
}

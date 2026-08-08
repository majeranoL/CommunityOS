import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';

import { AdminCommunityQueryDto } from './dto/admin-community-query.dto';
import { UpdateCommunityStatusDto } from './dto/update-community-status.dto';
import { ProvisionCommunityDto } from '../communities/dto/provision-community.dto';
import { CommunitiesService } from '../communities/communities.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Get('analytics')
  analytics() {
    return this.adminService.analytics();
  }

  @Get('communities')
  findAllCommunities(@Query() query: AdminCommunityQueryDto) {
    return this.adminService.findAllCommunities(query);
  }

  @Post('communities')
  provision(@Body() dto: ProvisionCommunityDto) {
    return this.communitiesService.provision(dto);
  }

  @Get('communities/:id')
  findOneCommunity(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findOneCommunity(id);
  }

  @Patch('communities/:id')
  updateCommunityStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityStatusDto,
  ) {
    return this.adminService.updateCommunityStatus(id, dto);
  }

  @Delete('communities/:id')
  removeCommunity(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.removeCommunity(id);
  }

  @Get('communities/:id/subscription')
  findSubscription(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findSubscription(id);
  }
}

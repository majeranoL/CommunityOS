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
  findAll(@Query() query: CommunityQueryDto) {
    return this.communitiesService.findAll(query);
  }

  // ==========================================
  // Get Community By ID
  // ==========================================

  @Get(':id')
  @Permissions('community.view')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.communitiesService.findOne(id);
  }

  // ==========================================
  // Update Community
  // ==========================================

  @Put(':id')
  @Permissions('community.update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommunityDto,
  ) {
    return this.communitiesService.update(id, dto);
  }

  // ==========================================
  // Delete Community
  // ==========================================

  @Delete(':id')
  @Permissions('community.delete')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.communitiesService.remove(id);
  }
}

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
  Request,
  UseGuards,
} from '@nestjs/common';

import { FeaturesService } from './features.service';

import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { AssignFeatureDto } from './dto/assign-feature.dto';
import { UpdateCommunityFeatureDto } from './dto/update-community-feature.dto';
import { FeatureQueryDto } from './dto/feature-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';

@Controller('admin/features')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  // ==========================================
  // Feature Catalog
  // ==========================================

  @Get()
  findAll(@Query() query: FeatureQueryDto) {
    return this.featuresService.findAll(query);
  }

  @Post()
  create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.featuresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeatureDto,
  ) {
    return this.featuresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.featuresService.remove(id);
  }

  // ==========================================
  // Community Assignments
  // ==========================================

  @Get(':id/communities')
  listCommunities(@Param('id', ParseUUIDPipe) id: string) {
    return this.featuresService.listCommunities(id);
  }

  @Post(':id/assign')
  assign(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignFeatureDto,
  ) {
    return this.featuresService.assign(id, req.user.id, dto);
  }

  @Patch(':id/assignments/:communityId')
  updateAssignment(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: UpdateCommunityFeatureDto,
  ) {
    return this.featuresService.updateAssignment(
      id,
      communityId,
      req.user.id,
      dto,
    );
  }

  @Delete(':id/assignments/:communityId')
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('communityId', ParseUUIDPipe) communityId: string,
  ) {
    return this.featuresService.revoke(id, communityId);
  }

  // ==========================================
  // Audit Log
  // ==========================================

  @Get(':id/audit')
  listAuditLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('communityId') communityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.featuresService.listAuditLogs(id, {
      communityId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ==========================================
  // Per-community view (superadmin)
  // ==========================================

  @Get('by-community/:communityId')
  listByCommunity(@Param('communityId', ParseUUIDPipe) communityId: string) {
    return this.featuresService.listByCommunity(communityId);
  }

  @Get('by-community/:communityId/audit')
  listAuditLogsByCommunity(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.featuresService.listAuditLogsByCommunity(communityId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}

import {
  Body,
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

import { ConstructionService } from './construction.service';
import { CreateConstructionRequestDto } from './dto/create-construction-request.dto';
import { ConstructionQueryDto } from './dto/construction-query.dto';
import { ConstructionRequirementDto } from './dto/construction-requirement.dto';
import { ResolveConstructionBondDto } from './dto/resolve-construction-bond.dto';
import { ReviewConstructionRequestDto } from './dto/review-construction-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Feature } from '../../common/decorators/feature.decorator';
import { hasAnyPermission } from '../../common/utils/permissions';

@Controller('construction-requests')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@Feature('construction-management')
export class ConstructionController {
  constructor(private readonly construction: ConstructionService) {}

  @Get('requirements')
  @Permissions('construction.view')
  requirements(@Request() req: any) {
    return this.construction.listRequirements(req.user.community.id);
  }

  @Post('requirements')
  @Permissions('construction.requirements')
  createRequirement(@Request() req: any, @Body() dto: ConstructionRequirementDto) {
    return this.construction.saveRequirement(req.user.community.id, req.user.id, dto);
  }

  @Patch('requirements/:id')
  @Permissions('construction.requirements')
  updateRequirement(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConstructionRequirementDto,
  ) {
    return this.construction.saveRequirement(req.user.community.id, req.user.id, dto, id);
  }

  @Get()
  @Permissions('construction.view')
  list(@Request() req: any, @Query() query: ConstructionQueryDto) {
    const includeAll = hasAnyPermission(req.user, ['construction.review']);
    return this.construction.list(req.user.community.id, req.user, query, includeAll);
  }

  @Get(':id')
  @Permissions('construction.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    const includeAll = hasAnyPermission(req.user, ['construction.review']);
    return this.construction.findOne(req.user.community.id, id, req.user, includeAll);
  }

  @Post()
  @Permissions('construction.create')
  create(@Request() req: any, @Body() dto: CreateConstructionRequestDto) {
    return this.construction.create(req.user.community.id, req.user, dto);
  }

  @Put(':id/review')
  @Permissions('construction.review')
  review(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewConstructionRequestDto,
  ) {
    return this.construction.review(req.user.community.id, id, req.user.id, dto);
  }

  @Put(':id/complete')
  @Permissions('construction.complete')
  complete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.construction.complete(req.user.community.id, id, req.user.id);
  }

  @Put(':id/close')
  @Permissions('construction.close')
  close(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.construction.close(req.user.community.id, id, req.user.id);
  }

  @Delete(':id')
  @Permissions('construction.create')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.construction.cancel(req.user.community.id, id, req.user);
  }

  @Put('bonds/:id/resolve')
  @Permissions('construction.bond')
  resolveBond(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveConstructionBondDto,
  ) {
    return this.construction.resolveBond(req.user.community.id, id, req.user.id, dto);
  }
}

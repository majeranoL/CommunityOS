import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PermissionsService } from './permissions.service';

import { PermissionQueryDto } from './dto/permission-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  // ==========================================
  // Get All Permissions
  // ==========================================

  @Get()
  @Permissions('permission.view')
  findAll(@Request() req: any, @Query() query: PermissionQueryDto) {
    return this.permissionsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Permission Modules
  // ==========================================

  @Get('modules')
  @Permissions('permission.view')
  findModules(@Request() req: any) {
    return this.permissionsService.findModules(req.user.community.id);
  }

  // ==========================================
  // Get Permission By ID
  // ==========================================

  @Get(':id')
  @Permissions('permission.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.findOne(req.user.community.id, id);
  }
}

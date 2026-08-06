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
  Request,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ==========================================
  // Create Role
  // ==========================================

  @Post()
  @Permissions('role.manage')
  create(@Request() req: any, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Roles
  // ==========================================

  @Get()
  @Permissions('role.manage')
  findAll(@Request() req: any, @Query() query: RoleQueryDto) {
    return this.rolesService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get Role By ID
  // ==========================================

  @Get(':id')
  @Permissions('role.manage')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Role
  // ==========================================

  @Put(':id')
  @Permissions('role.manage')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(req.user.community.id, id, dto);
  }

  @Post(':id/permissions')
  @Permissions('permission.manage')
  assignPermissions(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(
      req.user.community.id,
      id,
      dto.permissionIds,
    );
  }

  // ==========================================
  // Delete Role
  // ==========================================

  @Delete(':id')
  @Permissions('role.manage')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.remove(req.user.community.id, id);
  }
}

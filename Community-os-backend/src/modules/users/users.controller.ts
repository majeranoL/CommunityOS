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

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==========================================
  // Create User
  // ==========================================

  @Post()
  @Permissions('user.create')
  create(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Users
  // ==========================================

  @Get()
  @Permissions('user.view')
  findAll(@Request() req: any, @Query() query: UserQueryDto) {
    return this.usersService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get User By ID
  // ==========================================

  @Get(':id')
  @Permissions('user.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update User
  // ==========================================

  @Put(':id')
  @Permissions('user.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete User
  // ==========================================

  @Delete(':id')
  @Permissions('user.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(req.user.community.id, id);
  }
}

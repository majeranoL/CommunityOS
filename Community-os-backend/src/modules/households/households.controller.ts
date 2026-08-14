import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { HouseholdsService } from './households.service';

import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { HouseholdQueryDto } from './dto/household-query.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('households')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  // ==========================================
  // Create Household
  // ==========================================

  @Post()
  @Permissions('household.create')
  create(@Request() req: any, @Body() dto: CreateHouseholdDto) {
    return this.householdsService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Households
  // ==========================================

  @Get()
  @Permissions('household.view')
  findAll(@Request() req: any, @Query() query: HouseholdQueryDto) {
    return this.householdsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Get My Household (self-service statement)
  // A member can read their own household's
  // record without household.view
  // ==========================================

  @Get('me')
  @Permissions('assessment.view')
  findMe(@Request() req: any) {
    const householdId = req.user.resident?.household?.id;

    if (!householdId) {
      throw new NotFoundException('No household is linked to your account.');
    }

    return this.householdsService.findOne(req.user.community.id, householdId);
  }

  // ==========================================
  // Get Household By ID
  // ==========================================

  @Get(':id')
  @Permissions('household.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.householdsService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Household
  // ==========================================

  @Put(':id')
  @Permissions('household.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHouseholdDto,
  ) {
    return this.householdsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Transfer Ownership
  // ==========================================

  @Post(':id/transfer-ownership')
  @Permissions('household.update')
  transferOwnership(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
  ) {
    return this.householdsService.transferOwnership(
      req.user.community.id,
      id,
      dto,
    );
  }

  // ==========================================
  // Delete Household
  // ==========================================

  @Delete(':id')
  @Permissions('household.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.householdsService.remove(req.user.community.id, id);
  }
}

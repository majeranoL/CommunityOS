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

import { PetsService } from './pets.service';

import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { VerifyPetDto } from './dto/verify-pet.dto';
import { PetQueryDto } from './dto/pet-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { Feature } from '../../common/decorators/feature.decorator';

@Controller('pets')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@Feature('pet-registration')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  // ==========================================
  // Create Pet
  // ==========================================

  @Post()
  @Permissions('pet.create')
  create(@Request() req: any, @Body() dto: CreatePetDto) {
    return this.petsService.create(req.user.community.id, req.user, dto);
  }

  // ==========================================
  // Get All Pets
  // ==========================================

  @Get()
  @Permissions('pet.view')
  findAll(@Request() req: any, @Query() query: PetQueryDto) {
    return this.petsService.findAll(req.user.community.id, req.user, query);
  }

  // ==========================================
  // Get Pet By ID
  // ==========================================

  @Get(':id')
  @Permissions('pet.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Pet
  // ==========================================

  @Put(':id')
  @Permissions('pet.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePetDto,
  ) {
    return this.petsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Verify Pending Pet
  // ==========================================

  @Post(':id/verify')
  @Permissions('pet.verify')
  verify(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyPetDto,
  ) {
    return this.petsService.verify(req.user.community.id, req.user.id, id, dto);
  }

  // ==========================================
  // Deactivate Pet
  // ==========================================

  @Post(':id/deactivate')
  @Permissions('pet.update')
  deactivate(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.deactivate(req.user.community.id, id);
  }

  // ==========================================
  // Revalidate Pet
  // ==========================================

  @Post(':id/revalidate')
  @Permissions('pet.update')
  revalidate(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.revalidate(req.user.community.id, id);
  }

  // ==========================================
  // Delete Pet
  // ==========================================

  @Delete(':id')
  @Permissions('pet.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.petsService.remove(req.user.community.id, id);
  }
}

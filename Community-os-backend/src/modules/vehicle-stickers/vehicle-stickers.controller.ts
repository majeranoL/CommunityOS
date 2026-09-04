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

import { VehicleStickersService } from './vehicle-stickers.service';

import { CreateStickerDto } from './dto/create-sticker.dto';
import { UpdateStickerDto } from './dto/update-sticker.dto';
import { VerifyStickerDto } from './dto/verify-sticker.dto';
import { StickerQueryDto } from './dto/sticker-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { Feature } from '../../common/decorators/feature.decorator';

@Controller('vehicle-stickers')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@Feature('vehicle-stickers')
export class VehicleStickersController {
  constructor(
    private readonly vehicleStickersService: VehicleStickersService,
  ) {}

  // ==========================================
  // Sticker Request Options (fee preview)
  // ==========================================

  @Get('options')
  @Permissions('sticker.view')
  options(@Request() req: any) {
    return this.vehicleStickersService.options(req.user.community.id);
  }

  // ==========================================
  // Request Sticker (resident self-service)
  // ==========================================

  @Post('request')
  @Permissions('sticker.create')
  request(
    @Request() req: any,
    @Body() dto: { vehicleId: string; notes?: string },
  ) {
    return this.vehicleStickersService.request(
      req.user.community.id,
      req.user,
      dto,
    );
  }

  // ==========================================
  // Create Sticker (officer direct issue)
  // ==========================================

  @Post()
  @Permissions('sticker.create')
  create(@Request() req: any, @Body() dto: CreateStickerDto) {
    return this.vehicleStickersService.create(
      req.user.community.id,
      req.user,
      dto,
    );
  }

  // ==========================================
  // Get All Stickers
  // ==========================================

  @Get()
  @Permissions('sticker.view')
  findAll(@Request() req: any, @Query() query: StickerQueryDto) {
    return this.vehicleStickersService.findAll(
      req.user.community.id,
      req.user,
      query,
    );
  }

  // ==========================================
  // Get Stickers By Vehicle
  // ==========================================

  @Get('vehicle/:vehicleId')
  @Permissions('sticker.view')
  findByVehicle(
    @Request() req: any,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
  ) {
    return this.vehicleStickersService.findByVehicle(
      req.user.community.id,
      req.user,
      vehicleId,
    );
  }

  // ==========================================
  // Get Sticker By ID
  // ==========================================

  @Get(':id')
  @Permissions('sticker.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleStickersService.findOne(
      req.user.community.id,
      req.user,
      id,
    );
  }

  // ==========================================
  // Update Sticker
  // ==========================================

  @Put(':id')
  @Permissions('sticker.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStickerDto,
  ) {
    return this.vehicleStickersService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Verify Sticker
  // ==========================================

  @Post(':id/verify')
  @Permissions('sticker.verify')
  verify(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyStickerDto,
  ) {
    return this.vehicleStickersService.verify(
      req.user.community.id,
      req.user,
      id,
      dto,
    );
  }

  // ==========================================
  // Renew Sticker
  // ==========================================

  @Post(':id/renew')
  @Permissions('sticker.create')
  renew(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { expirationDate: Date; notes?: string },
  ) {
    return this.vehicleStickersService.renew(
      req.user.community.id,
      req.user,
      id,
      dto,
    );
  }

  // ==========================================
  // Delete Sticker
  // ==========================================

  @Delete(':id')
  @Permissions('sticker.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleStickersService.remove(req.user.community.id, id);
  }
}

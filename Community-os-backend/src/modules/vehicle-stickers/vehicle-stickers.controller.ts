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
import { RequestStickerDto } from './dto/request-sticker.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { UpdateStickerSettingsDto } from './dto/update-sticker-settings.dto';

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
  request(@Request() req: any, @Body() dto: RequestStickerDto) {
    return this.vehicleStickersService.request(
      req.user.community.id,
      req.user,
      dto,
    );
  }

  // ==========================================
  // Get All Sticker Requests
  // ==========================================

  @Get()
  @Permissions('sticker.view')
  requests(@Request() req: any, @Query() query: RequestQueryDto) {
    return this.vehicleStickersService.requests(
      req.user.community.id,
      req.user,
      query,
    );
  }

  @Get('requests')
  @Permissions('sticker.view')
  requestsAlias(@Request() req: any, @Query() query: RequestQueryDto) {
    return this.vehicleStickersService.requests(
      req.user.community.id,
      req.user,
      query,
    );
  }

  // ==========================================
  // Get Single Sticker Request
  // ==========================================

  @Get('requests/:id')
  @Permissions('sticker.view')
  requestFindOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleStickersService.requestFindOne(
      req.user.community.id,
      req.user,
      id,
    );
  }

  // ==========================================
  // Cancel Sticker Request
  // ==========================================

  @Delete('requests/:id')
  @Permissions('sticker.create')
  requestDelete(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleStickersService.requestDelete(
      req.user.community.id,
      req.user,
      id,
    );
  }

  // ==========================================
  // Verify Sticker Request (approve issues stickers)
  // ==========================================

  @Post(':id/verify')
  @Permissions('sticker.verify')
  requestVerify(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyStickerDto,
  ) {
    return this.vehicleStickersService.requestVerify(
      req.user.community.id,
      req.user,
      id,
      dto,
    );
  }

  // ==========================================
  // Sticker Settings (annual cycle + quantity rules)
  // ==========================================

  @Put('settings')
  @Permissions('sticker.verify')
  updateSettings(@Request() req: any, @Body() dto: UpdateStickerSettingsDto) {
    return this.vehicleStickersService.updateSettings(
      req.user.community.id,
      req.user,
      dto,
    );
  }

  // ==========================================
  // Create Sticker (officer direct issue)
  // ==========================================

  @Post()
  @Permissions('sticker.verify')
  create(@Request() req: any, @Body() dto: CreateStickerDto) {
    return this.vehicleStickersService.create(
      req.user.community.id,
      req.user,
      dto,
    );
  }

  // ==========================================
  // Get Stickers By Vehicle (issued records)
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
  // Issued sticker record endpoints (legacy management)
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

  @Put(':id')
  @Permissions('sticker.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStickerDto,
  ) {
    return this.vehicleStickersService.update(req.user.community.id, id, dto);
  }

  @Post(':id/renew')
  @Permissions('sticker.verify')
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

  @Delete(':id')
  @Permissions('sticker.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehicleStickersService.remove(req.user.community.id, id);
  }
}

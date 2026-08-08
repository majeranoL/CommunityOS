import {
  Body,
  Controller,
  Get,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PlatformSettingsService } from './platform-settings.service';

import { UpdateSettingsDto } from '../settings/dto/update-settings.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';

@Controller('admin/platform-settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class PlatformSettingsController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  // ==========================================
  // Get All Platform Settings
  // ==========================================

  @Get()
  findAll() {
    return this.platformSettingsService.findAll();
  }

  // ==========================================
  // Update Multiple Platform Settings
  // ==========================================

  @Put()
  updateMany(@Request() req: any, @Body() dto: UpdateSettingsDto) {
    return this.platformSettingsService.updateMany(req.user.id, dto.settings);
  }
}

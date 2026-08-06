import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { SettingsService } from './settings.service';

import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ==========================================
  // Get All Settings
  // ==========================================

  @Get()
  @Permissions('settings.view')
  findAll(@Request() req: any) {
    return this.settingsService.findAll(req.user.community.id);
  }

  // ==========================================
  // Get Defaults
  // ==========================================

  @Get('defaults')
  @Permissions('settings.view')
  defaults() {
    return this.settingsService.defaults();
  }

  // ==========================================
  // Update Multiple Settings
  // ==========================================

  @Put()
  @Permissions('settings.manage')
  updateMany(@Request() req: any, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateMany(
      req.user.community.id,
      req.user.id,
      dto.settings,
    );
  }

  // ==========================================
  // Update Single Setting
  // ==========================================

  @Put(':key')
  @Permissions('settings.manage')
  update(
    @Request() req: any,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.settingsService.update(
      req.user.community.id,
      req.user.id,
      key,
      dto,
    );
  }
}

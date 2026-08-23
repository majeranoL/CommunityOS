import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { DuesAutomationService } from './dues-automation.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { IsOptional, IsUUID } from 'class-validator';

class RunDuesAutomationDto {
  @IsOptional()
  @IsUUID()
  communityId?: string;
}

@Controller('finance/dues-automation')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DuesAutomationController {
  constructor(private readonly duesAutomationService: DuesAutomationService) {}

  @Post('run')
  @Permissions('finance.manage')
  run(@Body() dto: RunDuesAutomationDto) {
    return this.duesAutomationService.run(dto.communityId);
  }
}

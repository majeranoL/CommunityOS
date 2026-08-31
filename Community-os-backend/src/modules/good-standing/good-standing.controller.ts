import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { GoodStandingService } from './good-standing.service';

import { GenerateQrDto } from './dto/generate-qr.dto';
import { VerifyQrDto } from './dto/verify-qr.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { Feature } from '../../common/decorators/feature.decorator';

@Controller('good-standing')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@Feature('good-bad-standing')
export class GoodStandingController {
  constructor(private readonly goodStandingService: GoodStandingService) {}

  // ==========================================
  // Generate a Good Standing QR pass
  // (self-service: own household; officers
  // with household.view may pass a householdId)
  // ==========================================

  @Post('qr')
  @Permissions('household.view')
  generate(@Request() req: any, @Body() dto: GenerateQrDto) {
    const householdId = dto.householdId ?? req.user.resident?.household?.id;

    if (!householdId) {
      throw new BadRequestException('No household is linked to your account.');
    }

    return this.goodStandingService.generate(
      req.user.community.id,
      householdId,
    );
  }

  // ==========================================
  // Verify a Good Standing QR pass (gate)
  // ==========================================

  @Post('verify')
  @Permissions('visitor.check-in')
  verify(@Request() req: any, @Body() dto: VerifyQrDto) {
    return this.goodStandingService.verify(
      req.user.community.id,
      dto.token,
      req.user.id,
    );
  }
}

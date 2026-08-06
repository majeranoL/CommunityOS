import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('sweep')
  @Permissions('billing.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Run the billing sweep manually' })
  sweep() {
    return this.billingService.sweep();
  }

  @Get('summary')
  @Permissions('billing.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Get billing summary for the community' })
  summary(@Request() req: any) {
    return this.billingService.summary(req.user.community.id);
  }

  @Get('limits')
  @Permissions('billing.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Get plan usage and limits for the community' })
  limits(@Request() req: any) {
    return this.billingService.limits(req.user.community.id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ==========================================
  // Current subscription
  // ==========================================

  @Get('current')
  @Permissions('subscription.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Get current subscription' })
  current(@Request() req: any) {
    return this.subscriptionsService.current(req.user.community.id);
  }

  // ==========================================
  // List subscriptions
  // ==========================================

  @Get()
  @Permissions('subscription.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List subscriptions' })
  findAll(@Request() req: any, @Query() query: SubscriptionQueryDto) {
    return this.subscriptionsService.findAll(req.user.community.id, query);
  }

  // ==========================================
  // Subscribe to a plan
  // ==========================================

  @Post()
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Subscribe to a plan' })
  subscribe(@Request() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.subscribe(req.user.community.id, dto);
  }

  // ==========================================
  // Renew subscription
  // ==========================================

  @Post(':id/renew')
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Renew subscription' })
  renew(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.renew(req.user.community.id, id);
  }

  // ==========================================
  // Cancel subscription
  // ==========================================

  @Post(':id/cancel')
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Cancel subscription' })
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.cancel(req.user.community.id, id);
  }

  // ==========================================
  // Generate invoice
  // ==========================================

  @Post(':id/generate-invoice')
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Generate an invoice for the subscription' })
  generateInvoice(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.generateInvoice(req.user.community.id, id);
  }
}

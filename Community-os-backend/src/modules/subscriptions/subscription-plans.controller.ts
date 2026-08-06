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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { CreateSubscriptionPlanDto } from './dto/create-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-plan.dto';
import { PlanQueryDto } from './dto/plan-query.dto';
import { SubscriptionPlansService } from './subscription-plans.service';

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Post()
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Create subscription plan' })
  create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionPlansService.create(dto);
  }

  @Get()
  @Permissions('subscription.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'List subscription plans' })
  findAll(@Query() query: PlanQueryDto) {
    return this.subscriptionPlansService.findAll(query);
  }

  @Get(':id')
  @Permissions('subscription.view')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Get subscription plan' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionPlansService.findOne(id);
  }

  @Put(':id')
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Update subscription plan' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionPlansService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('subscription.manage')
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Delete subscription plan' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionPlansService.remove(id);
  }
}

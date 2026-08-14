import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { BillingPeriodsService } from './billing-periods.service';

import {
  BillingPeriodQueryDto,
  CreateBillingPeriodDto,
  GenerateBillingPeriodsDto,
} from './dto/billing-period.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('billing-periods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingPeriodsController {
  constructor(private readonly billingPeriodsService: BillingPeriodsService) {}

  @Post()
  @Permissions('finance.manage')
  create(@Request() req: any, @Body() dto: CreateBillingPeriodDto) {
    return this.billingPeriodsService.create(req.user.community.id, dto);
  }

  @Post('generate')
  @Permissions('finance.manage')
  generate(@Request() req: any, @Body() dto: GenerateBillingPeriodsDto) {
    return this.billingPeriodsService.generate(req.user.community.id, dto);
  }

  @Get()
  @Permissions('finance.view_all')
  findAll(@Request() req: any, @Query() query: BillingPeriodQueryDto) {
    return this.billingPeriodsService.findAll(req.user.community.id, query);
  }

  @Get(':id')
  @Permissions('finance.view_all')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.billingPeriodsService.findOne(req.user.community.id, id);
  }

  @Patch(':id')
  @Permissions('finance.manage')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBillingPeriodDto>,
  ) {
    return this.billingPeriodsService.update(req.user.community.id, id, dto);
  }

  @Delete(':id')
  @Permissions('finance.manage')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.billingPeriodsService.remove(req.user.community.id, id);
  }
}

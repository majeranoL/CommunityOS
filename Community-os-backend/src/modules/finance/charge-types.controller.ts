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

import { ChargeTypesService } from './charge-types.service';

import { CreateChargeTypeDto } from './dto/charge-type.dto';
import { UpdateChargeTypeDto } from './dto/update-charge-type.dto';
import { ChargeTypeQueryDto } from './dto/charge-type-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('charge-types')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ChargeTypesController {
  constructor(private readonly chargeTypesService: ChargeTypesService) {}

  @Post()
  @Permissions('finance.manage')
  create(@Request() req: any, @Body() dto: CreateChargeTypeDto) {
    return this.chargeTypesService.create(req.user.community.id, dto);
  }

  @Get()
  @Permissions('finance.view_all')
  findAll(@Request() req: any, @Query() query: ChargeTypeQueryDto) {
    return this.chargeTypesService.findAll(req.user.community.id, query);
  }

  @Get(':id')
  @Permissions('finance.view_all')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.chargeTypesService.findOne(req.user.community.id, id);
  }

  @Patch(':id')
  @Permissions('finance.manage')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChargeTypeDto,
  ) {
    return this.chargeTypesService.update(req.user.community.id, id, dto);
  }

  @Delete(':id')
  @Permissions('finance.manage')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.chargeTypesService.remove(req.user.community.id, id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import { PaymentMethodConfigMethod } from '@prisma/client';

import { PaymentMethodsService } from './payment-methods.service';

import { PaymentMethodConfigDto } from './dto/payment-method-config.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../common/guards/platform-admin.guard';
import { PlatformAdmin } from '../../common/decorators/platform-admin.decorator';

// Platform-wide payment methods (communityId = null). Used for subscription
// payments. Managed by superadmin only.
@Controller('admin/payment-methods')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class PaymentMethodsAdminController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll() {
    return this.paymentMethodsService.findAll({ communityId: null });
  }

  @Post()
  create(@Body() dto: PaymentMethodConfigDto) {
    return this.paymentMethodsService.save({ communityId: null }, dto);
  }

  @Put(':method')
  update(
    @Param('method', new ParseEnumPipe(PaymentMethodConfigMethod))
    method: PaymentMethodConfigMethod,
    @Body() dto: PaymentMethodConfigDto,
  ) {
    return this.paymentMethodsService.save(
      { communityId: null },
      { ...dto, method },
    );
  }

  @Delete(':method')
  remove(
    @Param('method', new ParseEnumPipe(PaymentMethodConfigMethod))
    method: PaymentMethodConfigMethod,
  ) {
    return this.paymentMethodsService.remove({ communityId: null }, method);
  }
}

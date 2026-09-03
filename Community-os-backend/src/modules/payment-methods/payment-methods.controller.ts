import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PaymentMethodConfigMethod } from '@prisma/client';

import { PaymentMethodsService } from './payment-methods.service';

import { PaymentMethodConfigDto } from './dto/payment-method-config.dto';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

type AuthenticatedRequest = { user: { community: { id: string } } };

// Community-scoped payment methods (dues). Managed by finance officers.
@Controller('payment-methods')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  // ==========================================
  // Management (officers / finance.manage)
  // ==========================================

  @Get('admin')
  @Permissions('finance.manage')
  findAll(@Request() req: AuthenticatedRequest) {
    return this.paymentMethodsService.findAll({
      communityId: req.user.community.id,
    });
  }

  @Post('admin')
  @Permissions('finance.manage')
  create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: PaymentMethodConfigDto,
  ) {
    return this.paymentMethodsService.save(
      { communityId: req.user.community.id },
      dto,
    );
  }

  @Put('admin/:method')
  @Permissions('finance.manage')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('method', new ParseEnumPipe(PaymentMethodConfigMethod))
    method: PaymentMethodConfigMethod,
    @Body() dto: PaymentMethodConfigDto,
  ) {
    return this.paymentMethodsService.save(
      { communityId: req.user.community.id },
      { ...dto, method },
    );
  }

  @Delete('admin/:method')
  @Permissions('finance.manage')
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('method', new ParseEnumPipe(PaymentMethodConfigMethod))
    method: PaymentMethodConfigMethod,
  ) {
    return this.paymentMethodsService.remove(
      { communityId: req.user.community.id },
      method,
    );
  }

  // ==========================================
  // Resident read (any authenticated member of the community)
  // ==========================================

  @Get('active')
  @Permissions('finance.view_own')
  findActive(@Request() req: AuthenticatedRequest) {
    return this.paymentMethodsService.findActive({
      communityId: req.user.community.id,
    });
  }
}

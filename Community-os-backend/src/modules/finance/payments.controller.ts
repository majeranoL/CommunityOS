import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';

import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { hasAnyPermission } from '../../common/utils/permissions';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private resolveScope(user: any): string | undefined {
    const isManager = hasAnyPermission(user, [
      'payment.create',
      'payment.update',
      'payment.delete',
      'payment.confirm',
      'payment.reject',
      'payment.refund',
    ]);

    if (isManager) return undefined;

    return user.resident?.household?.id;
  }

  // ==========================================
  // Create Payment
  // ==========================================

  @Post()
  @Permissions('payment.create')
  create(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.community.id, dto);
  }

  // ==========================================
  // Get All Payments
  // ==========================================

  @Get()
  @Permissions('payment.view')
  findAll(@Request() req: any, @Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }

  // ==========================================
  // Get Payment By ID
  // ==========================================

  @Get(':id')
  @Permissions('payment.view')
  findOne(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(req.user.community.id, id);
  }

  // ==========================================
  // Update Payment
  // ==========================================

  @Put(':id')
  @Permissions('payment.update')
  update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(req.user.community.id, id, dto);
  }

  // ==========================================
  // Delete Payment
  // ==========================================

  @Delete(':id')
  @Permissions('payment.delete')
  remove(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.remove(req.user.community.id, id);
  }

  // ==========================================
  // Confirm Payment
  // ==========================================

  @Patch(':id/confirm')
  @Permissions('payment.confirm')
  confirm(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.confirm(req.user.community.id, id);
  }

  // ==========================================
  // Reject Payment
  // ==========================================

  @Patch(':id/reject')
  @Permissions('payment.reject')
  reject(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.reject(req.user.community.id, id);
  }

  // ==========================================
  // Refund Payment
  // ==========================================

  @Patch(':id/refund')
  @Permissions('payment.refund')
  refund(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.refund(req.user.community.id, id);
  }
}

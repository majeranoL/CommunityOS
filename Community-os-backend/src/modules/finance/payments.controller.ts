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
import { RejectPaymentDto } from './dto/payment-review.dto';

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
      'finance.view_all',
      'finance.manage',
      'finance.verify',
      'finance.reject',
      'finance.refund',
      'payment.cancel',
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
  // Create a Gateway (online) Checkout for resident dues
  // ==========================================

  @Post('checkout')
  @Permissions('payment.create')
  checkout(@Request() req: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.createGatewayCheckout(
      req.user.community.id,
      dto,
    );
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
    return this.paymentsService.findOne(
      req.user.community.id,
      id,
      this.resolveScope(req.user),
    );
  }

  // ==========================================
  // Get Payment Receipt
  // ==========================================

  @Get(':id/receipt')
  @Permissions('payment.view')
  receipt(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.receipt(
      req.user.community.id,
      id,
      this.resolveScope(req.user),
    );
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
  // Verify Payment
  // ==========================================

  @Patch(':id/verify')
  @Permissions('finance.verify')
  verify(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.verify(req.user.community.id, id, req.user.id);
  }

  // ==========================================
  // Reject Payment (reason required)
  // ==========================================

  @Patch(':id/reject')
  @Permissions('finance.reject')
  reject(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectPaymentDto,
  ) {
    return this.paymentsService.reject(
      req.user.community.id,
      id,
      dto,
      req.user.id,
    );
  }

  // ==========================================
  // Refund Payment
  // ==========================================

  @Patch(':id/refund')
  @Permissions('finance.refund')
  refund(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.refund(req.user.community.id, id, req.user.id);
  }

  // ==========================================
  // Cancel Payment
  // ==========================================

  @Patch(':id/cancel')
  @Permissions('payment.cancel')
  cancel(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.cancel(req.user.community.id, id, req.user.id);
  }
}

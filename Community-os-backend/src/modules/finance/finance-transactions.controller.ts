import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';

import { FinanceTransactionsService } from './finance-transactions.service';

import { FinanceTransactionQueryDto } from './dto/finance-transaction-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { hasAnyPermission } from '../../common/utils/permissions';

@Controller('finance/transactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceTransactionsController {
  constructor(
    private readonly financeTransactionsService: FinanceTransactionsService,
  ) {}

  private resolveScope(user: any): string | undefined {
    const canViewAll = hasAnyPermission(user, [
      'finance.view_all',
      'finance.manage',
    ]);

    if (canViewAll) return undefined;

    return user.resident?.household?.id;
  }

  @Get()
  @Permissions('finance.view_own')
  findAll(@Request() req: any, @Query() query: FinanceTransactionQueryDto) {
    return this.financeTransactionsService.findAll(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }
}

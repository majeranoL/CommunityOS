import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';

import { FinanceTransactionsService } from './finance-transactions.service';

import { IncomeStatementQueryDto } from './dto/income-statement-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { FinanceTransparencyGuard } from '../../common/guards/finance-transparency.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

@Controller('finance/income-statement')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncomeStatementController {
  constructor(
    private readonly financeTransactionsService: FinanceTransactionsService,
  ) {}

  // ==========================================
  // Income statement (read-only fund view)
  // ==========================================

  @Get()
  @UseGuards(FinanceTransparencyGuard)
  @Permissions('finance.income_statement_view')
  statement(@Request() req: any, @Query() query: IncomeStatementQueryDto) {
    return this.financeTransactionsService.incomeStatement(
      req.user.community.id,
      query.from,
      query.to,
    );
  }
}

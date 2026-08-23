import { Controller, Get, Request, UseGuards } from '@nestjs/common';

import { FinanceTransactionsService } from './finance-transactions.service';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { hasAnyPermission } from '../../common/utils/permissions';

@Controller('finance/overview')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceOverviewController {
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
  overview(@Request() req: any) {
    return this.financeTransactionsService.overview(
      req.user.community.id,
      this.resolveScope(req.user),
    );
  }
}

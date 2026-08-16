import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';

import { FinanceOptionsService } from './finance-options.service';

import { FinanceOptionsQueryDto } from './dto/finance-options-query.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

import { Permissions } from '../../common/decorators/permissions.decorator';

import { hasAnyPermission } from '../../common/utils/permissions';

@Controller('finance/options')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceOptionsController {
  constructor(private readonly financeOptionsService: FinanceOptionsService) {}

  private resolveScope(user: any): string | undefined {
    const isManager = hasAnyPermission(user, [
      'finance.view_all',
      'finance.manage',
      'finance.verify',
      'finance.reject',
      'finance.refund',
      'finance.waive',
      'finance.import',
      'finance.export',
    ]);

    if (isManager) return undefined;

    return user.resident?.household?.id;
  }

  // ==========================================
  // Household Options
  // ==========================================

  @Get('households')
  @Permissions('assessment.view')
  households(@Request() req: any, @Query() query: FinanceOptionsQueryDto) {
    return this.financeOptionsService.householdOptions(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }

  // ==========================================
  // Resident Options
  // ==========================================

  @Get('residents')
  @Permissions('assessment.view')
  residents(@Request() req: any, @Query() query: FinanceOptionsQueryDto) {
    return this.financeOptionsService.residentOptions(
      req.user.community.id,
      query,
      this.resolveScope(req.user),
    );
  }
}

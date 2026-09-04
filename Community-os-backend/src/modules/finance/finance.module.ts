import { Module } from '@nestjs/common';

import { AssessmentsController } from './assessments.controller';
import { PaymentsController } from './payments.controller';
import { FinanceOptionsController } from './finance-options.controller';
import { ChargeTypesController } from './charge-types.controller';
import { BillingPeriodsController } from './billing-periods.controller';
import { FinanceTransactionsController } from './finance-transactions.controller';
import { FinanceOverviewController } from './finance-overview.controller';
import { DuesAutomationController } from './dues-automation.controller';
import { DuesMonthsController } from './dues-months.controller';
import { FinanceImportExportController } from './finance-import-export.controller';
import { ExpensesController } from './expenses.controller';
import { IncomeStatementController } from './income-statement.controller';
import { UtilityExpensesController } from './utility-expenses.controller';

import { AssessmentsService } from './assessments.service';
import { PaymentsService } from './payments.service';
import { FinanceOptionsService } from './finance-options.service';
import { FinanceSyncService } from './finance-sync.service';
import { ChargeTypesService } from './charge-types.service';
import { BillingPeriodsService } from './billing-periods.service';
import { FinanceTransactionsService } from './finance-transactions.service';
import { DuesAutomationService } from './dues-automation.service';
import { DuesMonthsService } from './dues-months.service';
import { FinanceImportExportService } from './finance-import-export.service';
import { ExpensesService } from './expenses.service';
import { UtilityExpensesService } from './utility-expenses.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

import { FeaturesModule } from '../features/features.module';

import { PaymentsGatewayModule } from '../payments-gateway/payments-gateway.module';

import { FinanceTransparencyGuard } from '../../common/guards/finance-transparency.guard';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    FeaturesModule,
    PaymentsGatewayModule,
  ],
  controllers: [
    AssessmentsController,
    PaymentsController,
    FinanceOptionsController,
    ChargeTypesController,
    BillingPeriodsController,
    FinanceTransactionsController,
    FinanceOverviewController,
    DuesAutomationController,
    DuesMonthsController,
    FinanceImportExportController,
    ExpensesController,
    IncomeStatementController,
    UtilityExpensesController,
  ],
  providers: [
    AssessmentsService,
    PaymentsService,
    FinanceOptionsService,
    FinanceSyncService,
    ChargeTypesService,
    BillingPeriodsService,
    FinanceTransactionsService,
    DuesAutomationService,
    DuesMonthsService,
    FinanceImportExportService,
    ExpensesService,
    UtilityExpensesService,
    FinanceTransparencyGuard,
  ],
  exports: [
    AssessmentsService,
    PaymentsService,
    FinanceSyncService,
    ChargeTypesService,
    BillingPeriodsService,
    ExpensesService,
  ],
})
export class FinanceModule {}

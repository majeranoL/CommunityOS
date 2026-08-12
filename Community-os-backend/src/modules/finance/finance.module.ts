import { Module } from '@nestjs/common';

import { AssessmentsController } from './assessments.controller';
import { PaymentsController } from './payments.controller';
import { FinanceOptionsController } from './finance-options.controller';

import { AssessmentsService } from './assessments.service';
import { PaymentsService } from './payments.service';
import { FinanceOptionsService } from './finance-options.service';
import { FinanceSyncService } from './finance-sync.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    AssessmentsController,
    PaymentsController,
    FinanceOptionsController,
  ],
  providers: [
    AssessmentsService,
    PaymentsService,
    FinanceOptionsService,
    FinanceSyncService,
  ],
  exports: [AssessmentsService, PaymentsService, FinanceSyncService],
})
export class FinanceModule {}

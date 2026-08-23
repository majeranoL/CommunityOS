import { Module } from '@nestjs/common';

import { UtilityBillingController } from './utility-billing.controller';
import { UtilityBillingService } from './utility-billing.service';

import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [PrismaModule, FinanceModule],
  controllers: [UtilityBillingController],
  providers: [UtilityBillingService],
  exports: [UtilityBillingService],
})
export class UtilityBillingModule {}

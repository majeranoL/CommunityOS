import { Module } from '@nestjs/common';

import { UtilityBillingController } from './utility-billing.controller';
import { UtilityBillingService } from './utility-billing.service';

import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UtilityBillingController],
  providers: [UtilityBillingService],
  exports: [UtilityBillingService],
})
export class UtilityBillingModule {}

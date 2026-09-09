import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { HouseholdCreditAdminController } from './household-credit-admin.controller';

import { PrismaModule } from '../../prisma/prisma.module';
import { CommunitiesModule } from '../communities/communities.module';
import { HouseholdCreditService } from '../finance/household-credit.service';
import { FinanceSyncService } from '../finance/finance-sync.service';

@Module({
  imports: [PrismaModule, CommunitiesModule],
  controllers: [AdminController, HouseholdCreditAdminController],
  providers: [AdminService, HouseholdCreditService, FinanceSyncService],
})
export class AdminModule {}

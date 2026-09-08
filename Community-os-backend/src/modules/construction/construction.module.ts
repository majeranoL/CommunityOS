import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogsModule } from '../auditlogs/audit-logs.module';
import { FinanceModule } from '../finance/finance.module';
import { FeaturesModule } from '../features/features.module';
import { ConstructionController } from './construction.controller';
import { ConstructionService } from './construction.service';

@Module({
  imports: [PrismaModule, AuditLogsModule, FinanceModule, FeaturesModule],
  controllers: [ConstructionController],
  providers: [ConstructionService],
  exports: [ConstructionService],
})
export class ConstructionModule {}

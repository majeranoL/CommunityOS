import { Module } from '@nestjs/common';

import { AssessmentsController } from './assessments.controller';
import { PaymentsController } from './payments.controller';

import { AssessmentsService } from './assessments.service';
import { PaymentsService } from './payments.service';

import { PrismaModule } from '../../prisma/prisma.module';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [AssessmentsController, PaymentsController],
  providers: [AssessmentsService, PaymentsService],
  exports: [AssessmentsService, PaymentsService],
})
export class FinanceModule {}

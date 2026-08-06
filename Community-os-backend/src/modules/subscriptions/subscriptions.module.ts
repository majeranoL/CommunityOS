import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SubscriptionPlansController,
    SubscriptionsController,
    InvoicesController,
    BillingController,
  ],
  providers: [
    SubscriptionPlansService,
    SubscriptionsService,
    InvoicesService,
    BillingService,
  ],
  exports: [
    SubscriptionPlansService,
    SubscriptionsService,
    InvoicesService,
    BillingService,
  ],
})
export class SubscriptionsModule {}

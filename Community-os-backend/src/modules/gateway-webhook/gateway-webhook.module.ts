import { Module } from '@nestjs/common';

import { PaymentsGatewayModule } from '../payments-gateway/payments-gateway.module';
import { FinanceModule } from '../finance/finance.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

import { GatewayWebhookController } from './gateway-webhook.controller';

@Module({
  imports: [PaymentsGatewayModule, FinanceModule, SubscriptionsModule],
  controllers: [GatewayWebhookController],
})
export class GatewayWebhookModule {}

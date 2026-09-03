import { Module } from '@nestjs/common';

import { PayMongoClient } from './paymongo.client';
import { PaymentsGatewayService } from './payments-gateway.service';

@Module({
  providers: [PayMongoClient, PaymentsGatewayService],
  exports: [PaymentsGatewayService],
})
export class PaymentsGatewayModule {}

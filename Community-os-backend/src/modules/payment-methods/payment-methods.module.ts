import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';

import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsAdminController } from './payment-methods-admin.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsPublicController } from './payment-methods-public.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PaymentMethodsAdminController,
    PaymentMethodsController,
    PaymentMethodsPublicController,
  ],
  providers: [PaymentMethodsService],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}

import { Controller, Get } from '@nestjs/common';

import { PaymentMethodsService } from './payment-methods.service';

// Public-ish read of the platform-wide (subscription) payment method. Visible to
// any caller so the signup / landing flow can show how to pay for the software.
@Controller('payment-methods/platform')
export class PaymentMethodsPublicController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findActive() {
    return this.paymentMethodsService.findActive({ communityId: null });
  }
}
